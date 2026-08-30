"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCapability, requireSession } from "@/lib/auth";
import { query, queryOne } from "@/db/client";
import { audit } from "@/lib/audit";
import { nextReference, recomputeEligibility, appendCustody, ensureConversation, postMessage } from "@/lib/shipments";
import { startCheckout, releasePayout } from "@/lib/finance";
import { fireWebhooks } from "@/lib/webhooks";

type ItemInput = { description: string; quantity: number; unit_value: number; category_code: string; origin_country?: string };

export async function createShipmentAction(formData: FormData) {
  const user = await requireCapability("shipment.create");
  const tenantId = user.tenantId;

  const corridorId = String(formData.get("corridor_id") ?? "");
  const recipientName = String(formData.get("recipient_name") ?? "").trim();
  const recipientPhone = String(formData.get("recipient_phone") ?? "").trim() || null;
  const recipientCity = String(formData.get("recipient_city") ?? "").trim() || null;
  const weight = parseFloat(String(formData.get("declared_weight_kg") ?? "")) || null;
  const length = parseFloat(String(formData.get("length_cm") ?? "")) || null;
  const width = parseFloat(String(formData.get("width_cm") ?? "")) || null;
  const height = parseFloat(String(formData.get("height_cm") ?? "")) || null;
  const sealed = formData.get("is_sealed_closed") === "on";
  const deadline = String(formData.get("deadline") ?? "") || null;
  const pickup = String(formData.get("pickup_choice") ?? "HUB_DROPOFF");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  let items: ItemInput[] = [];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch { items = []; }
  items = items.filter((i) => i && i.description && i.description.trim());

  if (!corridorId || !recipientName) redirect("/app/shipments/new?error=Vul+de+verplichte+velden+in");
  if (items.length === 0) redirect("/app/shipments/new?error=Voeg+minstens+1+item+toe");

  const corridor = await queryOne<{ to_country: string }>(
    `SELECT to_country FROM corridors WHERE id = $1 AND tenant_id = $2`, [corridorId, tenantId]
  );

  const reference = await nextReference(tenantId);
  const shipment = await queryOne<{ id: string }>(
    `INSERT INTO shipments (tenant_id, reference, sender_id, corridor_id, service_mode,
        recipient_name, recipient_phone, recipient_city, recipient_country,
        declared_weight_kg, length_cm, width_cm, height_cm, is_sealed_closed, deadline,
        pickup_choice, notes, status, eligibility)
     VALUES ($1,$2,$3,$4,'CROWDSHIP',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'SCREENING','PENDING')
     RETURNING id`,
    [tenantId, reference, user.id, corridorId, recipientName, recipientPhone, recipientCity,
     corridor?.to_country ?? null, weight, length, width, height, sealed, deadline, pickup, notes]
  );
  const shipmentId = shipment!.id;

  for (const it of items) {
    await query(
      `INSERT INTO shipment_items (tenant_id, shipment_id, description, quantity, unit_value, currency, origin_country, category_code)
       VALUES ($1,$2,$3,$4,$5,'EUR',$6,$7)`,
      [tenantId, shipmentId, it.description.trim(), Math.max(1, it.quantity || 1), it.unit_value || 0,
       it.origin_country || null, it.category_code || "UNKNOWN"]
    );
  }

  await appendCustody({ tenantId, shipmentId, eventType: "CREATED", actorId: user.id, notes: "Zending aangemaakt door afzender." });
  const decision = await recomputeEligibility(tenantId, shipmentId);
  await appendCustody({ tenantId, shipmentId, eventType: "SCREENED", notes: `Automatische eligibility: ${decision}.` });

  // Bij ALLOW alvast open zetten voor aanbod; anders in screening/beoordeling.
  if (decision === "ALLOW") {
    await query(`UPDATE shipments SET status='QUOTED' WHERE id=$1`, [shipmentId]);
  }
  await ensureConversation({ tenantId, shipmentId, reference, senderId: user.id });

  await audit({ tenantId, userId: user.id, action: "SHIPMENT_CREATE", entityType: "shipment", entityId: shipmentId,
    summary: `${reference} aangemaakt (${decision})`, meta: { decision, items: items.length } });

  redirect(`/app/shipments/${shipmentId}`);
}

/** Afzender accepteert het bod van een reiziger → booking + payout held. */
export async function acceptOfferAction(formData: FormData) {
  const user = await requireCapability("shipment.create");
  const tenantId = user.tenantId;
  const shipmentId = String(formData.get("shipment_id") ?? "");
  const offerId = String(formData.get("offer_id") ?? "");

  const shipment = await queryOne<any>(
    `SELECT s.id, s.reference, s.sender_id, s.eligibility FROM shipments s WHERE s.id=$1 AND s.tenant_id=$2`,
    [shipmentId, tenantId]
  );
  if (!shipment || shipment.sender_id !== user.id) redirect("/app/shipments");
  if (shipment.eligibility !== "ALLOW") redirect(`/app/shipments/${shipmentId}?error=Alleen+toegestane+zendingen+kunnen+worden+geboekt`);

  const offer = await queryOne<any>(
    `SELECT id, traveler_id, price_eur::float8 AS price FROM offers WHERE id=$1 AND shipment_id=$2 AND status='OPEN'`,
    [offerId, shipmentId]
  );
  if (!offer) redirect(`/app/shipments/${shipmentId}?error=Bod+niet+beschikbaar`);

  await query(`UPDATE offers SET status='ACCEPTED' WHERE id=$1`, [offerId]);
  await query(`UPDATE offers SET status='DECLINED' WHERE shipment_id=$1 AND id<>$2 AND status='OPEN'`, [shipmentId, offerId]);
  await query(
    `INSERT INTO bookings (tenant_id, shipment_id, offer_id, traveler_id, agreed_price_eur, payout_status)
     VALUES ($1,$2,$3,$4,$5,'HELD')
     ON CONFLICT (shipment_id) DO UPDATE SET offer_id=$3, traveler_id=$4, agreed_price_eur=$5`,
    [tenantId, shipmentId, offerId, offer.traveler_id, offer.price]
  );
  await query(`UPDATE shipments SET status='BOOKED', updated_at=now() WHERE id=$1`, [shipmentId]);

  await appendCustody({ tenantId, shipmentId, eventType: "HANDOVER", actorId: user.id,
    notes: `Bod geaccepteerd (€${offer.price}). Betaling wordt vastgehouden tot levering.` });

  const convId = await ensureConversation({ tenantId, shipmentId, reference: shipment.reference, senderId: user.id, travelerId: offer.traveler_id });
  await postMessage({ tenantId, conversationId: convId, senderId: null, kind: "SYSTEM",
    body: `Bod geaccepteerd voor €${offer.price}. Rond de betaling af; BugaWuga houdt het bedrag vast tot bewijs van levering.` });

  await audit({ tenantId, userId: user.id, action: "OFFER_ACCEPT", entityType: "shipment", entityId: shipmentId,
    summary: `Bod geaccepteerd (€${offer.price})`, meta: { offerId } });

  // Start de betaling (simulatie-adapter) en stuur de afzender naar de checkout.
  const booking = await queryOne<{ id: string }>(`SELECT id FROM bookings WHERE shipment_id=$1`, [shipmentId]);
  const checkout = await startCheckout(tenantId, booking!.id);
  redirect(checkout.checkoutUrl ?? `/app/messages/${convId}`);
}

/** Ops/hub of afzender zet de zending een status verder (custody + lifecycle). */
export async function advanceStatusAction(formData: FormData) {
  const user = await requireSession();
  const tenantId = user.tenantId;
  const shipmentId = String(formData.get("shipment_id") ?? "");
  const to = String(formData.get("to_status") ?? "");
  const eventType = String(formData.get("event_type") ?? to);
  const sealNo = String(formData.get("seal_no") ?? "").trim() || null;

  const allowed = ["INTAKE", "SEALED", "IN_CUSTODY", "IN_TRANSIT", "CUSTOMS", "READY", "DELIVERED", "RETURNED", "CLOSED"];
  if (!allowed.includes(to)) redirect(`/app/shipments/${shipmentId}`);

  await query(`UPDATE shipments SET status=$1, updated_at=now() WHERE id=$2 AND tenant_id=$3`, [to, shipmentId, tenantId]);
  await appendCustody({ tenantId, shipmentId, eventType, actorId: user.id, sealNo,
    notes: `Status → ${to}${sealNo ? ` (zegel ${sealNo})` : ""}.` });

  // Bij levering: fondsen vrijgeven (state-based payout release via finance/adapter).
  if (to === "DELIVERED") {
    const booking = await queryOne<{ id: string }>(`SELECT id FROM bookings WHERE shipment_id=$1`, [shipmentId]);
    if (booking) await releasePayout(tenantId, booking.id);
    await appendCustody({ tenantId, shipmentId, eventType: "RELEASED", actorId: user.id, notes: "Uitbetaling verwerkt na bewijs van levering." });
  }
  await fireWebhooks(tenantId, "shipment.status", { shipment_id: shipmentId, status: to });
  await audit({ tenantId, userId: user.id, action: "SHIPMENT_ADVANCE", entityType: "shipment", entityId: shipmentId, summary: `→ ${to}` });
  revalidatePath(`/app/shipments/${shipmentId}`);
  redirect(`/app/shipments/${shipmentId}`);
}

/** Inspectie + verzegeling: legt de checklist vast (inspections) en zet de zending op SEALED. */
export async function submitInspectionAction(formData: FormData) {
  const user = await requireCapability("ops.intake");
  const tenantId = user.tenantId;
  const shipmentId = String(formData.get("shipment_id") ?? "");
  const sealNo = String(formData.get("seal_no") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const checks = ["contents", "quantity", "condition", "serials", "batteries", "liquids", "declaration"];
  const checklist: Record<string, boolean> = {};
  for (const c of checks) checklist[c] = formData.get(`chk_${c}`) === "on";
  const result = String(formData.get("result") ?? "PASS");

  if (!sealNo) redirect(`/app/shipments/${shipmentId}?error=Zegelnummer+verplicht`);

  await query(
    `INSERT INTO inspections (tenant_id, shipment_id, inspector_id, checklist, result, seal_no, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [tenantId, shipmentId, user.id, JSON.stringify(checklist), result, sealNo, notes]
  );
  if (result === "PASS") {
    await query(`UPDATE shipments SET status='SEALED', updated_at=now() WHERE id=$1 AND tenant_id=$2`, [shipmentId, tenantId]);
    await appendCustody({ tenantId, shipmentId, eventType: "SEALED", actorId: user.id, sealNo, notes: `Inspectie geslaagd, verzegeld (${sealNo}).` });
  } else {
    await query(`UPDATE shipments SET eligibility='HOLD', hold_reason='Inspectie afgekeurd', updated_at=now() WHERE id=$1`, [shipmentId]);
    await appendCustody({ tenantId, shipmentId, eventType: "HOLD", actorId: user.id, notes: `Inspectie afgekeurd: ${notes ?? result}` });
  }
  await audit({ tenantId, userId: user.id, action: "INSPECTION", entityType: "shipment", entityId: shipmentId, summary: result });
  redirect(`/app/shipments/${shipmentId}`);
}

/** Beoordeling ná levering: partijen beoordelen elkaar (1–4 sterren). */
export async function submitRatingAction(formData: FormData) {
  const user = await requireSession();
  const tenantId = user.tenantId;
  const shipmentId = String(formData.get("shipment_id") ?? "");
  const rateeId = String(formData.get("ratee_id") ?? "");
  const role = String(formData.get("role")) === "CLIENT" ? "CLIENT" : "CARRIER";
  const stars = Math.min(4, Math.max(1, parseInt(String(formData.get("stars") ?? "4"), 10) || 4));
  const comment = String(formData.get("comment") ?? "").trim() || null;
  if (!rateeId || rateeId === user.id) redirect(`/app/shipments/${shipmentId}`);

  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM ratings WHERE rater_id=$1 AND ratee_id=$2 AND shipment_id=$3 AND role=$4`,
    [user.id, rateeId, shipmentId, role]);
  if (!existing) {
    await query(
      `INSERT INTO ratings (tenant_id, rater_id, ratee_id, role, stars, comment, shipment_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [tenantId, user.id, rateeId, role, stars, comment, shipmentId]);
    await query(
      `UPDATE users u SET rating = sub.avg
         FROM (SELECT round(avg(stars)::numeric,2) AS avg FROM ratings WHERE ratee_id=$1) sub
        WHERE u.id=$1`, [rateeId]);
    await audit({ tenantId, userId: user.id, action: "RATING_SUBMIT", entityType: "user", entityId: rateeId, summary: `${stars}★ (${role})` });
  }
  redirect(`/app/shipments/${shipmentId}?ok=rated`);
}
