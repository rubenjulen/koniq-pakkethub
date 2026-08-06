"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth";
import { query, queryOne } from "@/db/client";
import { settleCharge, releasePayout } from "@/lib/finance";
import { decideVerification } from "@/lib/adapters/kyc";
import { appendCustody } from "@/lib/shipments";
import { fireWebhooks } from "@/lib/webhooks";
import { audit } from "@/lib/audit";

export async function simPaymentAction(formData: FormData) {
  const user = await requireCapability("control.view");
  const intentId = String(formData.get("intent_id") ?? "");
  const success = String(formData.get("outcome") ?? "") === "success";
  await settleCharge(user.tenantId, intentId, success);
  revalidatePath("/app/console");
  redirect("/app/console");
}

export async function simKycAction(formData: FormData) {
  const user = await requireCapability("control.view");
  const verificationId = String(formData.get("verification_id") ?? "");
  const approve = String(formData.get("outcome") ?? "") === "approve";
  await decideVerification({ verificationId, approve, reviewerId: user.id, notes: approve ? "Sandbox: goedgekeurd" : "Sandbox: afgewezen" });
  revalidatePath("/app/console");
  redirect("/app/console");
}

/** Simuleer een volledige levering (zet DELIVERED + betaalt uit). */
export async function simDeliveryAction(formData: FormData) {
  const user = await requireCapability("control.view");
  const tenantId = user.tenantId;
  const shipmentId = String(formData.get("shipment_id") ?? "");
  await query(`UPDATE shipments SET status='DELIVERED', updated_at=now() WHERE id=$1 AND tenant_id=$2`, [shipmentId, tenantId]);
  await appendCustody({ tenantId, shipmentId, eventType: "DELIVERED", actorId: user.id, notes: "Simulatie: afgeleverd via Test Console." });
  const booking = await queryOne<{ id: string }>(`SELECT id FROM bookings WHERE shipment_id=$1`, [shipmentId]);
  if (booking) await releasePayout(tenantId, booking.id);
  await fireWebhooks(tenantId, "shipment.status", { shipment_id: shipmentId, status: "DELIVERED" });
  await audit({ tenantId, userId: user.id, action: "SIM_DELIVERY", entityType: "shipment", entityId: shipmentId });
  revalidatePath("/app/console");
  redirect("/app/console");
}

export async function setCorridorStatusAction(formData: FormData) {
  const user = await requireCapability("control.view");
  const corridorId = String(formData.get("corridor_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["PLANNED", "PILOT", "LIVE", "PAUSED"].includes(status)) redirect("/app/console");
  await query(`UPDATE corridors SET status=$1 WHERE id=$2 AND tenant_id=$3`, [status, corridorId, user.tenantId]);
  await audit({ tenantId: user.tenantId, userId: user.id, action: "CORRIDOR_STATUS", entityType: "corridor", entityId: corridorId, summary: status });
  revalidatePath("/app/console");
  redirect("/app/console");
}
