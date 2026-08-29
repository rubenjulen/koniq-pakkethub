import "server-only";
import { query, queryOne } from "@/db/client";
import { PROVIDERS, FX_RATES, BASE_CURRENCY } from "./config";

/**
 * Betaal-adapter. SIMULATED = 'BugaWuga Pay (sandbox)': maakt een payment intent aan die
 * in de status REQUIRES_ACTION staat tot een tester 'm bevestigt (via de demo-checkout of de
 * Test Console). Zo simuleer je een echte betaalflow, inclusief mislukken en terugboeken.
 *
 * Echte livegang vervangt de 'markIntent'-simulatie door webhooks van Mollie/Stripe/een
 * gelicentieerde escrow-partij — dezelfde intent-statussen, dezelfde finance-afhandeling.
 */

export type IntentPurpose = "CHARGE" | "PAYOUT" | "REFUND";
export type IntentStatus = "REQUIRES_ACTION" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "REFUNDED";

export function fxTo(amount: number, currency: string): number {
  const rate = FX_RATES[currency] ?? 1;
  return Math.round(amount * rate * 100) / 100;
}

export async function createIntent(opts: {
  tenantId: string;
  purpose: IntentPurpose;
  amountEur: number;
  currency?: string;
  payerId?: string | null;
  payeeId?: string | null;
  referenceType: string;
  referenceId: string;
  description?: string;
}): Promise<{ id: string; status: IntentStatus; checkoutUrl: string | null }> {
  const currency = opts.currency ?? BASE_CURRENCY;
  const fxRate = FX_RATES[currency] ?? 1;
  // Payout/refund gaan direct naar PROCESSING; charge wacht op klantactie.
  const initial: IntentStatus = opts.purpose === "CHARGE" ? "REQUIRES_ACTION" : "PROCESSING";
  const row = await queryOne<{ id: string }>(
    `INSERT INTO payment_intents (tenant_id, purpose, amount_eur, currency, fx_rate, payer_id, payee_id,
        reference_type, reference_id, provider, status, description)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
    [opts.tenantId, opts.purpose, opts.amountEur, currency, fxRate, opts.payerId ?? null, opts.payeeId ?? null,
     opts.referenceType, opts.referenceId, PROVIDERS.payments.name, initial, opts.description ?? null]
  );
  const id = row!.id;
  const checkoutUrl = opts.purpose === "CHARGE" ? `/app/pay/${id}` : null;
  return { id, status: initial, checkoutUrl };
}

/** Zet de intent-status. In SIMULATED wordt dit door de tester/console aangeroepen. */
export async function markIntent(intentId: string, status: IntentStatus, providerRef?: string) {
  await query(
    `UPDATE payment_intents SET status=$1, provider_ref=coalesce($2, provider_ref), updated_at=now() WHERE id=$3`,
    [status, providerRef ?? null, intentId]
  );
}

export async function getIntent(intentId: string) {
  return queryOne<any>(
    `SELECT id, tenant_id, purpose, amount_eur::float8 AS amount_eur, currency, fx_rate::float8 AS fx_rate,
            payer_id, payee_id, reference_type, reference_id, provider, status, description, created_at
       FROM payment_intents WHERE id=$1`,
    [intentId]
  );
}
