"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth";
import { query, queryOne } from "@/db/client";
import { audit } from "@/lib/audit";
import { appendCustody } from "@/lib/shipments";
import { RULE_VERSION } from "@/lib/eligibility";

const OVERRIDABLE = ["ALLOW", "REVIEW", "HOLD", "FREIGHT_ONLY", "REJECT"];

/**
 * Handmatige override van de eligibility door een beoordelaar (four-eyes:
 * reden verplicht, wordt gelogd als aparte beslissing + custody-event + audit).
 * De deterministische engine blijft de bron; dit registreert een menselijk besluit.
 */
export async function overrideEligibilityAction(formData: FormData) {
  const user = await requireCapability("ops.review");
  const tenantId = user.tenantId;
  const shipmentId = String(formData.get("shipment_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!OVERRIDABLE.includes(decision)) redirect(`/app/control/${shipmentId}?error=Ongeldige+beslissing`);
  if (reason.length < 5) redirect(`/app/control/${shipmentId}?error=Reden+is+verplicht`);

  const s = await queryOne<{ reference: string }>(`SELECT reference FROM shipments WHERE id=$1 AND tenant_id=$2`, [shipmentId, tenantId]);
  if (!s) redirect("/app/control");

  await query(
    `UPDATE shipments SET eligibility=$1, hold_reason=$2, status=CASE WHEN $1='ALLOW' THEN 'QUOTED' ELSE status END, updated_at=now()
      WHERE id=$3 AND tenant_id=$4`,
    [decision, decision === "ALLOW" ? null : reason, shipmentId, tenantId]
  );
  await query(
    `INSERT INTO eligibility_decisions (tenant_id, shipment_id, decision, reasons, rule_version, decided_by)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [tenantId, shipmentId, decision, JSON.stringify([`Handmatige override door ${user.name}: ${reason}`]), `${RULE_VERSION}+manual`, user.id]
  );
  await appendCustody({ tenantId, shipmentId, eventType: decision === "ALLOW" ? "RELEASED" : "HOLD", actorId: user.id,
    notes: `Override → ${decision}: ${reason}` });
  await audit({ tenantId, userId: user.id, action: "ELIGIBILITY_OVERRIDE", entityType: "shipment", entityId: shipmentId,
    summary: `${s.reference} → ${decision}`, meta: { reason } });

  redirect(`/app/control/${shipmentId}`);
}

/** Kill switch per corridor (beschermende blokkade). */
export async function toggleKillSwitchAction(formData: FormData) {
  const user = await requireCapability("control.view");
  const tenantId = user.tenantId;
  const corridorId = String(formData.get("corridor_id") ?? "");
  const on = formData.get("on") === "true";
  await query(`UPDATE corridors SET kill_switch=$1 WHERE id=$2 AND tenant_id=$3`, [on, corridorId, tenantId]);
  await audit({ tenantId, userId: user.id, action: "KILL_SWITCH", entityType: "corridor", entityId: corridorId,
    summary: on ? "Kill switch AAN" : "Kill switch UIT" });
  revalidatePath("/app/control");
  redirect("/app/control");
}
