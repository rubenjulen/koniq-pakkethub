import "server-only";
import { randomUUID } from "node:crypto";
import { query, queryOne } from "@/db/client";
import { createIntent, markIntent, getIntent } from "@/lib/adapters/payments";
import { notify } from "@/lib/adapters/notifications";
import { audit } from "@/lib/audit";
import { PLATFORM_FEE_PCT, PLATFORM_FEE_MIN_EUR } from "@/lib/adapters/config";

export function computeFee(priceEur: number): number {
  return Math.max(PLATFORM_FEE_MIN_EUR, Math.round(priceEur * PLATFORM_FEE_PCT * 100) / 100);
}

type Entry = { account: string; direction: "DEBIT" | "CREDIT"; amount: number };

/** Post een gebalanceerde transactie in het grootboek (som debet = som credit). */
async function postLedger(tenantId: string, entries: Entry[], refType: string, refId: string, memo: string) {
  const debit = entries.filter((e) => e.direction === "DEBIT").reduce((s, e) => s + e.amount, 0);
  const credit = entries.filter((e) => e.direction === "CREDIT").reduce((s, e) => s + e.amount, 0);
  if (Math.round((debit - credit) * 100) !== 0) {
    throw new Error(`Grootboek niet in balans: debet ${debit} ≠ credit ${credit}`);
  }
  const txnId = randomUUID();
  for (const e of entries) {
    await query(
      `INSERT INTO ledger_entries (tenant_id, txn_id, account, direction, amount_eur, ref_type, ref_id, memo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [tenantId, txnId, e.account, e.direction, e.amount, refType, refId, memo]
    );
  }
  return txnId;
}

async function creditWallet(tenantId: string, userId: string, amount: number) {
  await query(
    `INSERT INTO wallets (tenant_id, user_id, balance_eur) VALUES ($1,$2,$3)
     ON CONFLICT (tenant_id, user_id) DO UPDATE SET balance_eur = wallets.balance_eur + $3, updated_at=now()`,
    [tenantId, userId, amount]
  );
}

export async function walletBalance(tenantId: string, userId: string): Promise<number> {
  const row = await queryOne<{ b: number }>(
    `SELECT balance_eur::float8 AS b FROM wallets WHERE tenant_id=$1 AND user_id=$2`, [tenantId, userId]
  );
  return row?.b ?? 0;
}

export async function accountBalance(tenantId: string, account: string): Promise<number> {
  const row = await queryOne<{ b: number }>(
    `SELECT coalesce(sum(CASE WHEN direction='CREDIT' THEN amount_eur ELSE -amount_eur END),0)::float8 AS b
       FROM ledger_entries WHERE tenant_id=$1 AND account=$2`,
    [tenantId, account]
  );
  return Math.round((row?.b ?? 0) * 100) / 100;
}

/** Start de betaling voor een booking: maakt een CHARGE-intent (servicekosten + vervoersprijs). */
export async function startCheckout(tenantId: string, bookingId: string) {
  const b = await queryOne<any>(
    `SELECT bk.id, bk.agreed_price_eur::float8 AS price, bk.traveler_id, s.id AS shipment_id, s.sender_id, s.reference
       FROM bookings bk JOIN shipments s ON s.id=bk.shipment_id WHERE bk.id=$1 AND bk.tenant_id=$2`,
    [bookingId, tenantId]
  );
  if (!b) throw new Error("Booking niet gevonden.");
  const fee = computeFee(b.price);
  const total = Math.round((b.price + fee) * 100) / 100;
  const intent = await createIntent({
    tenantId, purpose: "CHARGE", amountEur: total, payerId: b.sender_id, payeeId: b.traveler_id,
    referenceType: "booking", referenceId: bookingId,
    description: `Betaling ${b.reference} — vervoer €${b.price} + servicekosten €${fee}`,
  });
  return { intentId: intent.id, checkoutUrl: intent.checkoutUrl, price: b.price, fee, total };
}

/** Verwerkt de uitkomst van een CHARGE-intent (door demo-checkout of Test Console). */
export async function settleCharge(tenantId: string, intentId: string, success: boolean) {
  const intent = await getIntent(intentId);
  if (!intent || intent.reference_type !== "booking") return;
  if (intent.status === "SUCCEEDED" || intent.status === "FAILED") return; // idempotent

  if (!success) {
    await markIntent(intentId, "FAILED");
    await audit({ tenantId, userId: null, action: "PAYMENT_FAILED", entityType: "booking", entityId: intent.reference_id });
    return;
  }
  await markIntent(intentId, "SUCCEEDED", `sim_${intentId.slice(0, 8)}`);
  // Geld komt binnen en wordt in escrow gehouden.
  await postLedger(tenantId,
    [{ account: "EXTERNAL", direction: "DEBIT", amount: intent.amount_eur },
     { account: "ESCROW", direction: "CREDIT", amount: intent.amount_eur }],
    "booking", intent.reference_id, "Betaling ontvangen — in bewaring (escrow)");

  const b = await queryOne<any>(
    `SELECT bk.traveler_id, s.reference, s.sender_id FROM bookings bk JOIN shipments s ON s.id=bk.shipment_id WHERE bk.id=$1`,
    [intent.reference_id]
  );
  await notify({ tenantId, userId: b?.traveler_id, template: "PAYMENT_HELD", title: "Betaling in bewaring",
    body: `De betaling voor ${b?.reference} staat veilig in bewaring. Je wordt uitbetaald na bewijs van levering.` });
  await notify({ tenantId, userId: b?.sender_id, template: "PAYMENT_OK", title: "Betaling gelukt",
    body: `Je betaling voor ${b?.reference} is ontvangen en wordt vastgehouden tot levering.` });
  await audit({ tenantId, userId: null, action: "PAYMENT_HELD", entityType: "booking", entityId: intent.reference_id,
    summary: `Escrow +€${intent.amount_eur}` });
}

/** Betaalt de reiziger uit na levering: escrow → wallet (vervoer) + platform (fee). */
export async function releasePayout(tenantId: string, bookingId: string) {
  const b = await queryOne<any>(
    `SELECT bk.id, bk.agreed_price_eur::float8 AS price, bk.traveler_id, bk.payout_status, s.reference
       FROM bookings bk JOIN shipments s ON s.id=bk.shipment_id WHERE bk.id=$1 AND bk.tenant_id=$2`,
    [bookingId, tenantId]
  );
  if (!b || b.payout_status === "RELEASED") return;
  // Alleen uitbetalen als er daadwerkelijk betaald is (escrow gevuld voor deze booking).
  const paid = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM payment_intents WHERE reference_type='booking' AND reference_id=$1 AND purpose='CHARGE' AND status='SUCCEEDED'`,
    [bookingId]
  );
  if (!paid || paid.n === 0) return;

  const fee = computeFee(b.price);
  const total = Math.round((b.price + fee) * 100) / 100;
  const intent = await createIntent({
    tenantId, purpose: "PAYOUT", amountEur: b.price, payeeId: b.traveler_id,
    referenceType: "booking", referenceId: bookingId, description: `Uitbetaling ${b.reference}`,
  });
  await markIntent(intent.id, "SUCCEEDED", `payout_${intent.id.slice(0, 8)}`);

  await postLedger(tenantId,
    [{ account: "ESCROW", direction: "DEBIT", amount: total },
     { account: `WALLET:${b.traveler_id}`, direction: "CREDIT", amount: b.price },
     { account: "PLATFORM_FEE", direction: "CREDIT", amount: fee }],
    "booking", bookingId, "Uitbetaling na levering + servicekosten");
  await creditWallet(tenantId, b.traveler_id, b.price);
  await query(`UPDATE bookings SET payout_status='RELEASED' WHERE id=$1`, [bookingId]);

  await notify({ tenantId, userId: b.traveler_id, template: "PAYOUT", title: "Uitbetaald 🎉",
    body: `Je bent uitbetaald voor ${b.reference}: €${b.price} staat in je wallet.` });
  await audit({ tenantId, userId: null, action: "PAYOUT_RELEASED", entityType: "booking", entityId: bookingId,
    summary: `Wallet +€${b.price}, fee €${fee}` });
}

/** Terugboeking naar de afzender (bijv. na een toegekende claim). */
export async function refundBooking(tenantId: string, bookingId: string, reason: string) {
  const b = await queryOne<any>(
    `SELECT bk.agreed_price_eur::float8 AS price, s.sender_id, s.reference, bk.payout_status
       FROM bookings bk JOIN shipments s ON s.id=bk.shipment_id WHERE bk.id=$1 AND bk.tenant_id=$2`,
    [bookingId, tenantId]
  );
  if (!b) return;
  const escrow = await accountBalance(tenantId, "ESCROW");
  const fee = computeFee(b.price);
  const total = Math.round((b.price + fee) * 100) / 100;
  if (escrow < total) return; // al uitbetaald — buiten scope van deze demo-refund

  const intent = await createIntent({
    tenantId, purpose: "REFUND", amountEur: total, payeeId: b.sender_id,
    referenceType: "booking", referenceId: bookingId, description: `Terugboeking ${b.reference}: ${reason}`,
  });
  await markIntent(intent.id, "REFUNDED", `refund_${intent.id.slice(0, 8)}`);
  await postLedger(tenantId,
    [{ account: "ESCROW", direction: "DEBIT", amount: total },
     { account: "EXTERNAL", direction: "CREDIT", amount: total }],
    "booking", bookingId, `Terugboeking: ${reason}`);
  await query(`UPDATE bookings SET payout_status='REFUNDED' WHERE id=$1`, [bookingId]);
  await notify({ tenantId, userId: b.sender_id, template: "REFUND", title: "Terugbetaald",
    body: `Je betaling voor ${b.reference} is teruggeboekt: €${total}.` });
  await audit({ tenantId, userId: null, action: "REFUND", entityType: "booking", entityId: bookingId, summary: reason });
}
