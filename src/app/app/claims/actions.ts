"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession, requireCapability } from "@/lib/auth";
import { query, queryOne } from "@/db/client";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/adapters/notifications";
import { refundBooking } from "@/lib/finance";
import { appendCustody } from "@/lib/shipments";

/** Afzender/ontvanger opent een claim op een zending. */
export async function openClaimAction(formData: FormData) {
  const user = await requireSession();
  const tenantId = user.tenantId;
  const shipmentId = String(formData.get("shipment_id") ?? "");
  const claimType = String(formData.get("claim_type") ?? "OTHER");
  const description = String(formData.get("description") ?? "").trim();
  const amount = parseFloat(String(formData.get("amount_eur") ?? "")) || null;

  const s = await queryOne<any>(`SELECT id, reference, sender_id FROM shipments WHERE id=$1 AND tenant_id=$2`, [shipmentId, tenantId]);
  if (!s) redirect("/app/claims");
  if (!description) redirect(`/app/shipments/${shipmentId}?error=Beschrijf+de+claim`);

  const claim = await queryOne<{ id: string }>(
    `INSERT INTO claims (tenant_id, shipment_id, opened_by, claim_type, description, amount_eur, status)
     VALUES ($1,$2,$3,$4,$5,$6,'OPEN') RETURNING id`,
    [tenantId, shipmentId, user.id, claimType, description, amount]
  );
  await appendCustody({ tenantId, shipmentId, eventType: "HOLD", actorId: user.id, notes: `Claim geopend: ${claimType}` });
  await notify({ tenantId, userId: null, template: "CLAIM_OPEN", title: "Nieuwe claim",
    body: `Claim (${claimType}) geopend op ${s.reference}.` });
  await audit({ tenantId, userId: user.id, action: "CLAIM_OPEN", entityType: "claim", entityId: claim!.id, summary: `${s.reference} · ${claimType}` });
  redirect(`/app/claims/${claim!.id}`);
}

export async function postClaimMessageAction(formData: FormData) {
  const user = await requireSession();
  const claimId = String(formData.get("claim_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) redirect(`/app/claims/${claimId}`);
  await query(
    `INSERT INTO claim_messages (tenant_id, claim_id, sender_id, body) VALUES ($1,$2,$3,$4)`,
    [user.tenantId, claimId, user.id, body]
  );
  revalidatePath(`/app/claims/${claimId}`);
  redirect(`/app/claims/${claimId}`);
}

/** Ops/beheer lost de claim op: toewijzen (refund) of afwijzen. */
export async function resolveClaimAction(formData: FormData) {
  const user = await requireCapability("ops.review");
  const tenantId = user.tenantId;
  const claimId = String(formData.get("claim_id") ?? "");
  const outcome = String(formData.get("outcome") ?? "");     // REFUND | REJECT | INVESTIGATE
  const note = String(formData.get("resolution") ?? "").trim();

  const claim = await queryOne<any>(`SELECT id, shipment_id FROM claims WHERE id=$1 AND tenant_id=$2`, [claimId, tenantId]);
  if (!claim) redirect("/app/claims");

  if (outcome === "INVESTIGATE") {
    await query(`UPDATE claims SET status='INVESTIGATING', resolution=$1 WHERE id=$2`, [note || null, claimId]);
    revalidatePath(`/app/claims/${claimId}`);
    redirect(`/app/claims/${claimId}`);
  }

  const approve = outcome === "REFUND";
  await query(
    `UPDATE claims SET status=$1, resolution=$2, resolved_by=$3, resolved_at=now() WHERE id=$4`,
    [approve ? "RESOLVED" : "REJECTED", note || null, user.id, claimId]
  );
  if (approve) {
    const booking = await queryOne<{ id: string }>(`SELECT id FROM bookings WHERE shipment_id=$1`, [claim.shipment_id]);
    if (booking) await refundBooking(tenantId, booking.id, note || "Claim toegekend");
  }
  await notify({ tenantId, userId: null, template: "CLAIM_RESOLVED", title: "Claim afgehandeld",
    body: approve ? "Je claim is toegekend en het bedrag is teruggeboekt." : "Je claim is afgewezen." });
  await audit({ tenantId, userId: user.id, action: "CLAIM_RESOLVE", entityType: "claim", entityId: claimId, summary: outcome });
  redirect(`/app/claims/${claimId}`);
}

/** Retour aanvragen. */
export async function requestReturnAction(formData: FormData) {
  const user = await requireSession();
  const tenantId = user.tenantId;
  const shipmentId = String(formData.get("shipment_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  await query(`INSERT INTO returns (tenant_id, shipment_id, reason, status) VALUES ($1,$2,$3,'REQUESTED')`,
    [tenantId, shipmentId, reason || null]);
  await appendCustody({ tenantId, shipmentId, eventType: "RETURNED", actorId: user.id, notes: `Retour aangevraagd: ${reason}` });
  await audit({ tenantId, userId: user.id, action: "RETURN_REQUEST", entityType: "shipment", entityId: shipmentId });
  redirect(`/app/claims?returned=1`);
}
