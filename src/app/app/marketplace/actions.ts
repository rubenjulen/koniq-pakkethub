"use server";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import { query, queryOne } from "@/db/client";
import { audit } from "@/lib/audit";
import { ensureConversation, postMessage } from "@/lib/shipments";
import { notify } from "@/lib/adapters/notifications";

/** Reiziger doet een bod op een toegestane zending. */
export async function makeOfferAction(formData: FormData) {
  const user = await requireCapability("offer.create");
  const tenantId = user.tenantId;
  const shipmentId = String(formData.get("shipment_id") ?? "");
  const price = parseFloat(String(formData.get("price_eur") ?? "")) || 0;
  const message = String(formData.get("message") ?? "").trim() || null;
  const tripId = String(formData.get("trip_id") ?? "") || null;

  const s = await queryOne<any>(
    `SELECT id, reference, sender_id, eligibility FROM shipments WHERE id=$1 AND tenant_id=$2`,
    [shipmentId, tenantId]
  );
  if (!s) redirect("/app/marketplace");
  if (s.eligibility !== "ALLOW") redirect(`/app/marketplace/${shipmentId}?error=Deze+zending+is+niet+beschikbaar`);
  if (price <= 0) redirect(`/app/marketplace/${shipmentId}?error=Vul+een+geldige+prijs+in`);

  // Eén open bod per reiziger per zending.
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM offers WHERE shipment_id=$1 AND traveler_id=$2 AND status='OPEN'`, [shipmentId, user.id]
  );
  if (existing) {
    await query(`UPDATE offers SET price_eur=$1, message=$2, trip_id=$3 WHERE id=$4`, [price, message, tripId, existing.id]);
  } else {
    await query(
      `INSERT INTO offers (tenant_id, shipment_id, trip_id, traveler_id, price_eur, message, status)
       VALUES ($1,$2,$3,$4,$5,$6,'OPEN')`,
      [tenantId, shipmentId, tripId, user.id, price, message]
    );
  }

  // Chat openen tussen afzender en reiziger, met het bod als eerste bericht.
  const convId = await ensureConversation({ tenantId, shipmentId, reference: s.reference, senderId: s.sender_id, travelerId: user.id });
  await postMessage({ tenantId, conversationId: convId, senderId: user.id, kind: "PROPOSAL",
    body: `${user.firstName} biedt €${price} aan om deze zending mee te nemen.${message ? ` "${message}"` : ""}`,
    meta: { price } });

  await notify({ tenantId, userId: s.sender_id, template: "OFFER_NEW", title: "Nieuw bod ontvangen",
    body: `${user.firstName} biedt €${price} op je zending ${s.reference}.` });
  await audit({ tenantId, userId: user.id, action: "OFFER_MAKE", entityType: "shipment", entityId: shipmentId,
    summary: `Bod €${price} op ${s.reference}` });

  redirect(`/app/messages/${convId}`);
}

/** Reiziger publiceert een rit (capaciteit op een corridor). */
export async function createTripAction(formData: FormData) {
  const user = await requireCapability("trip.create");
  const tenantId = user.tenantId;
  const corridorId = String(formData.get("corridor_id") ?? "");
  const depart = String(formData.get("depart_date") ?? "");
  const arrive = String(formData.get("arrive_date") ?? "") || null;
  const capacity = parseFloat(String(formData.get("capacity_kg") ?? "")) || 10;
  const priceInd = parseFloat(String(formData.get("price_indication_eur") ?? "")) || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!corridorId || !depart) redirect("/app/trips?error=Vul+corridor+en+vertrekdatum+in");

  await query(
    `INSERT INTO trips (tenant_id, traveler_id, corridor_id, depart_date, arrive_date, capacity_kg, price_indication_eur, notes, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'OPEN')`,
    [tenantId, user.id, corridorId, depart, arrive, capacity, priceInd, notes]
  );
  await audit({ tenantId, userId: user.id, action: "TRIP_CREATE", entityType: "trip", summary: "Rit gepubliceerd" });
  redirect("/app/trips");
}

/** Reiziger maakt een rit zichtbaar op de marktplaats (scherm "let people see my route"). */
export async function publishRouteAction(formData: FormData) {
  const user = await requireCapability("trip.create");
  const tenantId = user.tenantId;
  const tripId = String(formData.get("trip_id") ?? "");
  const visible = formData.get("visible") === "on" || formData.get("visible") === "1";
  // Publiek (anoniem op de website) impliceert zichtbaar-voor-leden.
  const publicListed = visible && (formData.get("public_listed") === "on" || formData.get("public_listed") === "1");
  const price = parseFloat(String(formData.get("price_eur") ?? ""));
  const size = String(formData.get("package_size") ?? "MEDIUM");
  const shortInfo = String(formData.get("short_info") ?? "").trim() || null;
  const longInfo = String(formData.get("long_info") ?? "").trim() || null;
  await query(
    `UPDATE trips SET visible=$1, public_listed=$2, price_indication_eur=$3, package_size=$4, short_info=$5, long_info=$6
      WHERE id=$7 AND tenant_id=$8 AND traveler_id=$9`,
    [visible, publicListed, Number.isFinite(price) ? price : null, size, shortInfo, longInfo, tripId, tenantId, user.id]
  );
  await audit({ tenantId, userId: user.id, action: "ROUTE_PUBLISH", entityType: "trip", entityId: tripId, summary: visible ? "zichtbaar" : "verborgen" });
  redirect("/app/trips?ok=1");
}

/** Afzender maakt een verzoek (zending) zichtbaar op de marktplaats. */
export async function publishRequestAction(formData: FormData) {
  const user = await requireCapability("shipment.create");
  const tenantId = user.tenantId;
  const shipmentId = String(formData.get("shipment_id") ?? "");
  const visible = formData.get("visible") === "on" || formData.get("visible") === "1";
  const publicListed = visible && (formData.get("public_listed") === "on" || formData.get("public_listed") === "1");
  const price = parseFloat(String(formData.get("offered_price_eur") ?? ""));
  const info = String(formData.get("request_info") ?? "").trim() || null;
  await query(
    `UPDATE shipments SET visible=$1, public_listed=$2, offered_price_eur=$3, request_info=$4
      WHERE id=$5 AND tenant_id=$6 AND sender_id=$7`,
    [visible, publicListed, Number.isFinite(price) ? price : null, info, shipmentId, tenantId, user.id]
  );
  await audit({ tenantId, userId: user.id, action: "REQUEST_PUBLISH", entityType: "shipment", entityId: shipmentId, summary: visible ? "zichtbaar" : "verborgen" });
  redirect(`/app/shipments/${shipmentId}?ok=1`);
}
