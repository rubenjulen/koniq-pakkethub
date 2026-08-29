"use server";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import { query, queryOne } from "@/db/client";
import { audit } from "@/lib/audit";
import { estimateEta } from "@/lib/adapters/routing";
import { appendCustody } from "@/lib/shipments";

export async function createConsolidationAction(formData: FormData) {
  const user = await requireCapability("ops.intake");
  const tenantId = user.tenantId;
  const hubId = String(formData.get("hub_id") ?? "") || null;
  const n = await queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM consolidations WHERE tenant_id=$1`, [tenantId]);
  const ref = `CONS-${new Date().getFullYear()}-${String((n?.n ?? 0) + 1).padStart(4, "0")}`;
  await query(`INSERT INTO consolidations (tenant_id, hub_id, reference, status) VALUES ($1,$2,$3,'OPEN')`, [tenantId, hubId, ref]);
  await audit({ tenantId, userId: user.id, action: "CONSOLIDATION_CREATE", entityType: "consolidation", summary: ref });
  redirect("/app/freight");
}

export async function bookFreightAction(formData: FormData) {
  const user = await requireCapability("ops.intake");
  const tenantId = user.tenantId;
  const shipmentId = String(formData.get("shipment_id") ?? "") || null;
  const carrier = String(formData.get("carrier_name") ?? "").trim() || "BugaWuga Freight (sandbox)";
  const mode = String(formData.get("mode") ?? "AIR");
  const n = await queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM freight_orders WHERE tenant_id=$1`, [tenantId]);
  const ref = `FRT-${new Date().getFullYear()}-${String((n?.n ?? 0) + 1).padStart(4, "0")}`;
  const eta = estimateEta({ mode: mode as any, fromCountry: "NL", toCountry: "SR" });
  await query(
    `INSERT INTO freight_orders (tenant_id, reference, shipment_id, carrier_name, mode, status, eta_days, docs)
     VALUES ($1,$2,$3,$4,$5,'BOOKED',$6,$7)`,
    [tenantId, ref, shipmentId, carrier, mode, eta.days, JSON.stringify(["AWB (sandbox)", "Commercial invoice (sandbox)"])]
  );
  if (shipmentId) {
    await query(`UPDATE shipments SET service_mode='FREIGHT', status='IN_TRANSIT' WHERE id=$1`, [shipmentId]);
    await appendCustody({ tenantId, shipmentId, eventType: "DEPARTED", actorId: user.id, notes: `Freight geboekt (${carrier}, ${mode})` });
  }
  await audit({ tenantId, userId: user.id, action: "FREIGHT_BOOK", entityType: "freight_order", summary: `${ref} ${mode}` });
  redirect("/app/freight");
}

export async function addToConsolidationAction(formData: FormData) {
  const user = await requireCapability("ops.intake");
  const tenantId = user.tenantId;
  const consolidationId = String(formData.get("consolidation_id") ?? "");
  const shipmentId = String(formData.get("shipment_id") ?? "");
  if (!shipmentId) redirect("/app/freight");
  await query(
    `INSERT INTO consolidation_items (consolidation_id, shipment_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [consolidationId, shipmentId]
  );
  await appendCustody({ tenantId, shipmentId, eventType: "HANDOVER", actorId: user.id, notes: "Toegevoegd aan consolidatie." });
  await audit({ tenantId, userId: user.id, action: "CONSOLIDATION_ADD", entityType: "consolidation", entityId: consolidationId });
  redirect("/app/freight");
}

export async function advanceConsolidationAction(formData: FormData) {
  const user = await requireCapability("ops.intake");
  const tenantId = user.tenantId;
  const consolidationId = String(formData.get("consolidation_id") ?? "");
  const to = String(formData.get("to_status") ?? "");
  if (!["SEALED", "DISPATCHED", "CLOSED"].includes(to)) redirect("/app/freight");
  await query(`UPDATE consolidations SET status=$1 WHERE id=$2 AND tenant_id=$3`, [to, consolidationId, tenantId]);
  if (to === "DISPATCHED") {
    // Zet alle zendingen in de consolidatie op onderweg.
    await query(
      `UPDATE shipments SET status='IN_TRANSIT', updated_at=now()
        WHERE id IN (SELECT shipment_id FROM consolidation_items WHERE consolidation_id=$1)`, [consolidationId]);
  }
  await audit({ tenantId, userId: user.id, action: "CONSOLIDATION_ADVANCE", entityType: "consolidation", entityId: consolidationId, summary: to });
  redirect("/app/freight");
}
