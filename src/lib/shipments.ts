import "server-only";
import { query, queryOne } from "@/db/client";
import { getCategoryMap, getCorridor } from "./tenant";
import { evaluateEligibility, RULE_VERSION, type Decision } from "./eligibility";
import { createHash } from "node:crypto";

/** Genereert een leesbare zendingsreferentie PH-JJJJ-NNNNNN. */
export async function nextReference(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const row = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM shipments WHERE tenant_id = $1`,
    [tenantId]
  );
  const seq = (row?.n ?? 0) + 101;
  return `PH-${year}-${String(seq).padStart(6, "0")}`;
}

/** Voegt een custody-event toe met automatisch oplopende volgnummer (append-only). */
export async function appendCustody(opts: {
  tenantId: string;
  shipmentId: string;
  eventType: string;
  actorId?: string | null;
  hubId?: string | null;
  sealNo?: string | null;
  notes?: string | null;
  locationText?: string | null;
}) {
  const row = await queryOne<{ seq: number }>(
    `SELECT coalesce(max(seq),0)::int AS seq FROM custody_events WHERE shipment_id = $1`,
    [opts.shipmentId]
  );
  const seq = (row?.seq ?? 0) + 1;
  await query(
    `INSERT INTO custody_events (tenant_id, shipment_id, seq, event_type, actor_id, hub_id, seal_no, notes, location_text)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [opts.tenantId, opts.shipmentId, seq, opts.eventType, opts.actorId ?? null, opts.hubId ?? null,
     opts.sealNo ?? null, opts.notes ?? null, opts.locationText ?? null]
  );
}

/**
 * Herberekent de eligibility van een zending op basis van items + corridor +
 * categorieën, en persisteert de beslissing (inputs-hash, reasons, rule-versie).
 * Zet ook shipments.eligibility en het status-veld waar passend.
 */
export async function recomputeEligibility(tenantId: string, shipmentId: string): Promise<Decision> {
  const shipment = await queryOne<any>(
    `SELECT s.id, s.corridor_id, s.is_sealed_closed, s.declared_weight_kg::float8 AS declared_weight_kg,
            u.kyc_status AS sender_kyc
       FROM shipments s JOIN users u ON u.id = s.sender_id
      WHERE s.tenant_id = $1 AND s.id = $2`,
    [tenantId, shipmentId]
  );
  if (!shipment) throw new Error("Zending niet gevonden.");

  const items = await query<any>(
    `SELECT description, quantity, unit_value::float8 AS unit_value, category_code
       FROM shipment_items WHERE shipment_id = $1`,
    [shipmentId]
  );
  const corridor = await getCorridor(tenantId, shipment.corridor_id);
  const categories = await getCategoryMap(tenantId);
  if (!corridor) throw new Error("Corridor niet gevonden.");

  const result = evaluateEligibility({
    items: items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unit_value: i.unit_value,
      category_code: i.category_code,
    })),
    isSealedClosed: shipment.is_sealed_closed,
    declaredWeightKg: shipment.declared_weight_kg,
    corridor,
    categories,
    senderKycVerified: shipment.sender_kyc === "VERIFIED",
  });

  const inputsHash = createHash("sha256")
    .update(JSON.stringify({ items, sealed: shipment.is_sealed_closed, corridor: corridor.code }))
    .digest("hex")
    .slice(0, 16);

  await query(
    `UPDATE shipments SET eligibility = $1, total_declared_value_eur = $2, updated_at = now()
      WHERE tenant_id = $3 AND id = $4`,
    [result.decision, result.totalValueEur, tenantId, shipmentId]
  );
  await query(
    `INSERT INTO eligibility_decisions (tenant_id, shipment_id, decision, reasons, rule_version, inputs_hash)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [tenantId, shipmentId, result.decision, JSON.stringify(result.reasons), RULE_VERSION, inputsHash]
  );

  return result.decision;
}

/** Zorgt dat er een gesprek bestaat voor de zending, met beide partijen. */
export async function ensureConversation(opts: {
  tenantId: string;
  shipmentId: string;
  reference: string;
  senderId: string;
  travelerId?: string | null;
}): Promise<string> {
  let conv = await queryOne<{ id: string }>(
    `SELECT id FROM conversations WHERE shipment_id = $1 LIMIT 1`,
    [opts.shipmentId]
  );
  if (!conv) {
    conv = await queryOne<{ id: string }>(
      `INSERT INTO conversations (tenant_id, shipment_id, subject, status, last_message_at)
       VALUES ($1,$2,$3,'OPEN', now()) RETURNING id`,
      [opts.tenantId, opts.shipmentId, `Overleg ${opts.reference}`]
    );
    await query(
      `INSERT INTO chat_messages (tenant_id, conversation_id, sender_id, kind, body)
       VALUES ($1,$2,null,'SYSTEM',$3)`,
      [opts.tenantId, conv!.id,
       `Gesprek gestart voor zending ${opts.reference}. Maak hier afspraken over ophalen, tijd en prijs. BugaWuga houdt betaling vast tot bewijs van levering.`]
    );
  }
  await query(
    `INSERT INTO conversation_participants (conversation_id, user_id, party_role)
     VALUES ($1,$2,'SENDER') ON CONFLICT DO NOTHING`,
    [conv!.id, opts.senderId]
  );
  if (opts.travelerId) {
    await query(
      `INSERT INTO conversation_participants (conversation_id, user_id, party_role)
       VALUES ($1,$2,'TRAVELER') ON CONFLICT DO NOTHING`,
      [conv!.id, opts.travelerId]
    );
  }
  return conv!.id;
}

export async function postMessage(opts: {
  tenantId: string;
  conversationId: string;
  senderId: string | null;
  kind?: string;
  body: string;
  meta?: Record<string, unknown>;
}) {
  await query(
    `INSERT INTO chat_messages (tenant_id, conversation_id, sender_id, kind, body, meta)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [opts.tenantId, opts.conversationId, opts.senderId ?? null, opts.kind ?? "TEXT", opts.body,
     JSON.stringify(opts.meta ?? {})]
  );
  await query(`UPDATE conversations SET last_message_at = now() WHERE id = $1`, [opts.conversationId]);
}
