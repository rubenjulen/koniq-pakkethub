"use server";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import { query, queryOne } from "@/db/client";
import { audit } from "@/lib/audit";
import { advanceManifest } from "@/lib/legs";

/** Nieuw (leeg) manifest aanmaken voor een corridor-beweging. */
export async function createManifestAction(formData: FormData) {
  const user = await requireCapability("ops.intake");
  const tenantId = user.tenantId;
  const mode = String(formData.get("mode") ?? "AIR");
  const carrierType = String(formData.get("carrier_type") ?? "FREIGHT");
  const carrierRef = String(formData.get("carrier_ref") ?? "") || null;
  const originHub = String(formData.get("origin_hub_id") ?? "") || null;
  const destHub = String(formData.get("dest_hub_id") ?? "") || null;

  // Referentie: MF-YYYY-NNNN afgeleid van de zending-teller-stijl.
  const seq = await queryOne<{ n: number }>(
    `SELECT count(*)::int + 1 AS n FROM manifests WHERE tenant_id=$1`, [tenantId]);
  const ref = `MF-${new Date().getUTCFullYear()}-${String(seq?.n ?? 1).padStart(4, "0")}`;

  const row = await queryOne<{ id: string }>(
    `INSERT INTO manifests (tenant_id, reference, mode, carrier_type, carrier_ref, origin_hub_id, dest_hub_id, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'DRAFT') RETURNING id`,
    [tenantId, ref, mode, carrierType, carrierRef, originHub, destHub]);
  await audit({ tenantId, userId: user.id, action: "MANIFEST_CREATE", entityType: "manifest", entityId: row?.id, summary: ref });
  redirect(`/app/manifests/${row?.id}`);
}

/** Een linehaul-leg van een zending aan dit manifest koppelen. */
export async function attachLegAction(formData: FormData) {
  const user = await requireCapability("ops.intake");
  const tenantId = user.tenantId;
  const manifestId = String(formData.get("manifest_id") ?? "");
  const shipmentId = String(formData.get("shipment_id") ?? "");
  if (!manifestId || !shipmentId) redirect(`/app/manifests/${manifestId}`);

  // Alleen koppelen als het manifest nog niet vertrokken is.
  const m = await queryOne<{ status: string; mode: string }>(
    `SELECT status, mode FROM manifests WHERE id=$1 AND tenant_id=$2`, [manifestId, tenantId]);
  if (!m || !["DRAFT", "SEALED"].includes(m.status)) redirect(`/app/manifests/${manifestId}?error=locked`);

  // Bestaat er al een LINEHAUL-leg voor deze zending? Koppel die; anders maak er een.
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM shipment_legs WHERE shipment_id=$1 AND leg_type='LINEHAUL' ORDER BY seq LIMIT 1`, [shipmentId]);
  if (existing) {
    await query(`UPDATE shipment_legs SET manifest_id=$1, mode=$2, status='ASSIGNED' WHERE id=$3`, [manifestId, m.mode, existing.id]);
  } else {
    const seqRow = await queryOne<{ n: number }>(
      `SELECT coalesce(max(seq),0)::int + 1 AS n FROM shipment_legs WHERE shipment_id=$1`, [shipmentId]);
    await query(
      `INSERT INTO shipment_legs (tenant_id, shipment_id, seq, leg_type, mode, carrier_type, manifest_id, status)
       VALUES ($1,$2,$3,'LINEHAUL',$4,'FREIGHT',$5,'ASSIGNED')`,
      [tenantId, shipmentId, seqRow?.n ?? 1, m.mode, manifestId]);
  }
  await audit({ tenantId, userId: user.id, action: "MANIFEST_ATTACH", entityType: "manifest", entityId: manifestId, summary: shipmentId });
  redirect(`/app/manifests/${manifestId}`);
}

/** Een leg van dit manifest loskoppelen. */
export async function detachLegAction(formData: FormData) {
  const user = await requireCapability("ops.intake");
  const tenantId = user.tenantId;
  const manifestId = String(formData.get("manifest_id") ?? "");
  const legId = String(formData.get("leg_id") ?? "");
  await query(`UPDATE shipment_legs SET manifest_id=NULL, status='PLANNED' WHERE id=$1 AND tenant_id=$2`, [legId, tenantId]);
  await audit({ tenantId, userId: user.id, action: "MANIFEST_DETACH", entityType: "manifest", entityId: manifestId });
  redirect(`/app/manifests/${manifestId}`);
}

/** Manifest een status verder zetten (verzegelen/vertrek/aankomst/sluiten). */
export async function advanceManifestAction(formData: FormData) {
  const user = await requireCapability("ops.intake");
  const manifestId = String(formData.get("manifest_id") ?? "");
  const to = String(formData.get("to") ?? "");
  const res = await advanceManifest({ tenantId: user.tenantId, actorId: user.id, manifestId, to });
  redirect(res.ok ? `/app/manifests/${manifestId}` : `/app/manifests/${manifestId}?error=1`);
}
