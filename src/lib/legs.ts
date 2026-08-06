import "server-only";
import { query, queryOne } from "@/db/client";
import { appendCustody } from "./shipments";
import { audit } from "./audit";

/** Icoon per vervoersmodus — taal-onafhankelijk, dus bruikbaar in elke locale. */
export const MODE_ICON: Record<string, string> = {
  ROAD: "🚚", AIR: "✈️", SEA: "🚢", RAIL: "🚂", TRAVELER: "🧳",
};

export type Leg = {
  id: string;
  seq: number;
  leg_type: string;
  mode: string;
  from_label: string | null;
  to_label: string | null;
  carrier_type: string;
  carrier_ref: string | null;
  status: string;
  manifest_id: string | null;
  manifest_ref: string | null;
  planned_at: string | null;
  completed_at: string | null;
};

/** Legs van één zending, op volgorde, met de manifest-referentie erbij. */
export async function getShipmentLegs(shipmentId: string): Promise<Leg[]> {
  return query<Leg>(
    `SELECT l.id, l.seq, l.leg_type, l.mode, l.from_label, l.to_label, l.carrier_type,
            l.carrier_ref, l.status, l.manifest_id, m.reference AS manifest_ref,
            l.planned_at, l.completed_at
       FROM shipment_legs l
       LEFT JOIN manifests m ON m.id = l.manifest_id
      WHERE l.shipment_id = $1
      ORDER BY l.seq`,
    [shipmentId]
  );
}

export type ManifestRow = {
  id: string; reference: string; mode: string; carrier_type: string; carrier_ref: string | null;
  origin: string | null; dest: string | null; depart_at: string | null; status: string;
  leg_count: number; shipment_count: number;
};

/** Alle manifesten van de tenant, met tellingen. */
export async function getManifests(tenantId: string): Promise<ManifestRow[]> {
  return query<ManifestRow>(
    `SELECT m.id, m.reference, m.mode, m.carrier_type, m.carrier_ref,
            oh.name AS origin, dh.name AS dest, m.depart_at, m.status,
            count(l.id)::int AS leg_count,
            count(DISTINCT l.shipment_id)::int AS shipment_count
       FROM manifests m
       LEFT JOIN hubs oh ON oh.id = m.origin_hub_id
       LEFT JOIN hubs dh ON dh.id = m.dest_hub_id
       LEFT JOIN shipment_legs l ON l.manifest_id = m.id
      WHERE m.tenant_id = $1
      GROUP BY m.id, oh.name, dh.name
      ORDER BY m.depart_at NULLS LAST, m.created_at DESC`,
    [tenantId]
  );
}

export async function getManifest(tenantId: string, id: string) {
  const manifest = await queryOne<any>(
    `SELECT m.*, oh.name AS origin_name, dh.name AS dest_name
       FROM manifests m
       LEFT JOIN hubs oh ON oh.id = m.origin_hub_id
       LEFT JOIN hubs dh ON dh.id = m.dest_hub_id
      WHERE m.id = $1 AND m.tenant_id = $2`,
    [id, tenantId]
  );
  if (!manifest) return null;
  const legs = await query<any>(
    `SELECT l.id, l.seq, l.leg_type, l.mode, l.status, l.from_label, l.to_label,
            s.id AS shipment_id, s.reference AS shipment_ref, s.recipient_city, s.status AS shipment_status
       FROM shipment_legs l
       JOIN shipments s ON s.id = l.shipment_id
      WHERE l.manifest_id = $1
      ORDER BY s.reference`,
    [id]
  );
  return { manifest, legs };
}

/** Geldige overgangen voor een manifest. */
export const MANIFEST_FLOW: Record<string, { to: string; label: string }[]> = {
  DRAFT: [{ to: "SEALED", label: "Verzegelen" }],
  SEALED: [{ to: "IN_TRANSIT", label: "Vertrek registreren" }],
  IN_TRANSIT: [{ to: "ARRIVED", label: "Aankomst registreren" }],
  ARRIVED: [{ to: "CLOSED", label: "Manifest sluiten" }],
  CLOSED: [],
};

/**
 * Zet een manifest een stap verder en werk de gekoppelde legs + zendingen bij.
 * Schrijft per zending een custody-event, zodat de keten traceerbaar blijft.
 */
export async function advanceManifest(opts: {
  tenantId: string; actorId: string; manifestId: string; to: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { tenantId, actorId, manifestId, to } = opts;
  const m = await queryOne<any>(
    `SELECT status FROM manifests WHERE id=$1 AND tenant_id=$2`, [manifestId, tenantId]
  );
  if (!m) return { ok: false, error: "Manifest niet gevonden." };
  const allowed = (MANIFEST_FLOW[m.status] ?? []).some((x) => x.to === to);
  if (!allowed) return { ok: false, error: "Ongeldige overgang." };

  // Manifest-status + tijdstempels
  const stamp =
    to === "SEALED" ? ", sealed_at = now()" :
    to === "IN_TRANSIT" ? ", depart_at = coalesce(depart_at, now())" :
    to === "ARRIVED" ? ", arrive_at = now()" : "";
  await query(`UPDATE manifests SET status=$1${stamp} WHERE id=$2`, [to, manifestId]);

  // Leg-status koppelen aan manifest-status
  const legStatus =
    to === "SEALED" ? "ASSIGNED" :
    to === "IN_TRANSIT" ? "IN_TRANSIT" :
    to === "ARRIVED" ? "ARRIVED" :
    to === "CLOSED" ? "COMPLETED" : null;
  if (legStatus) {
    const completeStamp = to === "CLOSED" || to === "ARRIVED" ? ", completed_at = now()" : "";
    await query(`UPDATE shipment_legs SET status=$1${completeStamp} WHERE manifest_id=$2`, [legStatus, manifestId]);
  }

  // Per gekoppelde zending: custody-event + waar zinvol de zendingstatus
  const legs = await query<{ shipment_id: string; ref: string }>(
    `SELECT DISTINCT l.shipment_id, m.reference AS ref
       FROM shipment_legs l JOIN manifests m ON m.id = l.manifest_id
      WHERE l.manifest_id = $1`, [manifestId]
  );
  const eventType =
    to === "IN_TRANSIT" ? "DEPARTED" :
    to === "ARRIVED" ? "ARRIVED" :
    to === "SEALED" ? "MANIFEST_SEALED" : "MANIFEST_CLOSED";
  for (const l of legs) {
    await appendCustody({
      tenantId, shipmentId: l.shipment_id, eventType, actorId,
      notes: `Manifest ${l.ref}: ${to}`,
    });
    if (to === "IN_TRANSIT") {
      await query(`UPDATE shipments SET status='IN_TRANSIT' WHERE id=$1 AND status IN ('SEALED','IN_CUSTODY','BOOKED','INTAKE')`, [l.shipment_id]);
    } else if (to === "ARRIVED") {
      await query(`UPDATE shipments SET status='CUSTOMS' WHERE id=$1 AND status='IN_TRANSIT'`, [l.shipment_id]);
    }
  }

  await audit({
    tenantId, userId: actorId, action: "MANIFEST_ADVANCE", entityType: "manifest",
    entityId: manifestId, summary: `Manifest → ${to} (${legs.length} zending(en))`,
  });
  return { ok: true };
}
