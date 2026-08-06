import "server-only";
import bcrypt from "bcryptjs";
import type { DbAdapter } from "./client";

/**
 * Seed voor de NL–SR pilot. Idempotent: draait alleen wanneer de tenant nog
 * niet bestaat. Vaste UUID's zodat relaties stabiel en herhaalbaar zijn.
 * Demo-wachtwoord voor alle accounts: demo12345
 */

const T = "10000000-0000-0000-0000-000000000001"; // tenant
const CORRIDOR = "20000000-0000-0000-0000-000000000001";

const ROLE = {
  ADMIN: "11000000-0000-0000-0000-0000000000a1",
  OPS: "11000000-0000-0000-0000-0000000000a2",
  SENDER: "11000000-0000-0000-0000-0000000000a3",
  TRAVELER: "11000000-0000-0000-0000-0000000000a4",
};

const USER = {
  ADMIN: "12000000-0000-0000-0000-0000000000b1",
  OPS: "12000000-0000-0000-0000-0000000000b2",
  SENDER: "12000000-0000-0000-0000-0000000000b3",
  TRAVELER: "12000000-0000-0000-0000-0000000000b4",
};

const HUB = {
  AMS: "13000000-0000-0000-0000-0000000000c1",
  PBM: "13000000-0000-0000-0000-0000000000c2",
};

const SHIPMENT = "14000000-0000-0000-0000-0000000000d1";
const TRIP = "15000000-0000-0000-0000-0000000000e1";
const CONV = "16000000-0000-0000-0000-0000000000f1";

async function q(db: DbAdapter, sql: string, params: unknown[] = []) {
  return db.query(sql, params);
}

export async function seedDatabase(db: DbAdapter) {
  const existing = await db.query<{ id: string }>(`SELECT id FROM tenants WHERE id = $1`, [T]);
  if (existing.rows.length > 0) return; // al geseed

  const pw = bcrypt.hashSync("demo12345", 10);

  // ---- Tenant ----
  await q(db,
    `INSERT INTO tenants (id, name, slug, timezone, currency, brand)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [T, "PakketHub", "pakkethub", "Europe/Amsterdam", "EUR",
     JSON.stringify({ tagline: "Gecontroleerde corridor-crowdshipping", color: "#0d9488" })]);

  // ---- Roles ----
  const roles: [string, string, string, string[]][] = [
    [ROLE.ADMIN, "ADMIN", "Platformbeheer", ["admin.all", "control.view", "ops.intake", "ops.review", "chat.use"]],
    [ROLE.OPS, "OPS", "Hub & operatie", ["ops.intake", "ops.review", "control.view", "chat.use"]],
    [ROLE.SENDER, "SENDER", "Afzender", ["shipment.create", "chat.use"]],
    [ROLE.TRAVELER, "TRAVELER", "Reiziger / vervoerder", ["trip.create", "offer.create", "chat.use"]],
  ];
  for (const [id, key, name, caps] of roles) {
    await q(db,
      `INSERT INTO roles (id, tenant_id, key, name, capabilities) VALUES ($1,$2,$3,$4,$5)`,
      [id, T, key, name, caps]);
  }

  // ---- Users ----
  const users: [string, string, string, string, string, string, string, string, string][] = [
    // id, role, first, last, email, phone, country, city, kyc_status
    [USER.ADMIN, ROLE.ADMIN, "Ruben", "Beheer", "admin@pakkethub.com", "+31600000001", "NL", "Amsterdam", "VERIFIED"],
    [USER.OPS, ROLE.OPS, "Naomi", "Hub", "hub@pakkethub.com", "+31600000002", "NL", "Amsterdam", "VERIFIED"],
    [USER.SENDER, ROLE.SENDER, "Sandra", "Afzender", "sender@pakkethub.com", "+31600000003", "NL", "Den Haag", "VERIFIED"],
    [USER.TRAVELER, ROLE.TRAVELER, "Winston", "Reiziger", "traveler@pakkethub.com", "+597700000004", "SR", "Paramaribo", "VERIFIED"],
  ];
  for (const [id, role, first, last, email, phone, country, city, kyc] of users) {
    await q(db,
      `INSERT INTO users (id, tenant_id, role_id, first_name, last_name, email, phone, country, city,
                          password_hash, is_platform_admin, kyc_status, kyc_level, rating, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'FULL',$13,true)`,
      [id, T, role, first, last, email, phone, country, city, pw,
       role === ROLE.ADMIN, kyc, role === ROLE.TRAVELER ? 4.8 : role === ROLE.SENDER ? 4.9 : null]);
  }

  // ---- Corridor (NL → SR pilot) ----
  await q(db,
    `INSERT INTO corridors (id, tenant_id, code, name, from_country, to_country, status,
                            max_item_value_eur, max_parcel_weight_kg, max_items_per_parcel, service_modes)
     VALUES ($1,$2,'NL-SR','Nederland → Suriname', 'NL','SR','PILOT', 250, 20, 20, $3)`,
    [CORRIDOR, T, ["CROWDSHIP", "HUB", "FREIGHT"]]);
  // Planned corridor (illustratief — nog niet actief).
  await q(db,
    `INSERT INTO corridors (tenant_id, code, name, from_country, to_country, status, service_modes)
     VALUES ($1,'SR-NL','Suriname → Nederland','SR','NL','PLANNED', $2)`,
    [T, ["CROWDSHIP", "HUB", "FREIGHT"]]);

  // ---- Positive-list categories ----
  const cats: [string, string, string, boolean, boolean, boolean, boolean, number | null, number][] = [
    // code, name, desc, eligible, requiresReview, prohibited, dangerous, maxValue, sort
    ["DOCS", "Documenten & papierwerk", "Brieven, contracten, printwerk", true, false, false, false, 100, 10],
    ["CLOTHING", "Kleding & textiel", "Nieuwe of persoonlijke kleding", true, false, false, false, 250, 20],
    ["FOOD_DRY", "Droge levensmiddelen", "Verpakt, houdbaar, niet-bederfelijk", true, false, false, false, 100, 30],
    ["COSMETICS", "Verzorging & cosmetica", "Niet-vloeibaar, verzegeld", true, false, false, false, 150, 40],
    ["TOYS", "Speelgoed", "Zonder batterijen/accu", true, false, false, false, 150, 50],
    ["ELECTRONICS_SMALL", "Kleine elektronica", "Telefoon-accessoires; accu vereist beoordeling", true, true, false, false, 250, 60],
    ["MEDICINE", "Medicatie", "Alleen met recept — handmatige beoordeling", false, true, false, false, null, 70],
    ["BATTERIES", "Losse batterijen / accu's", "Gevaarlijke goederen — niet via reiziger", false, true, false, true, null, 80],
    ["LIQUIDS", "Vloeistoffen", "Volume-/lekrisico — beoordeling of freight", false, true, false, false, null, 90],
    ["CASH", "Contant geld / waardepapier", "Niet toegestaan", false, false, true, false, null, 100],
    ["WEAPONS", "Wapens & munitie", "Verboden", false, false, true, true, null, 110],
    ["DRUGS", "Verdovende middelen", "Verboden", false, false, true, false, null, 120],
    ["PERISHABLE", "Bederfelijke waren", "Vers/gekoeld — niet via reiziger", false, true, false, false, null, 130],
    ["UNKNOWN", "Onbekend / niet opgegeven", "Verplicht specificeren", false, true, false, false, null, 200],
  ];
  for (const [code, name, desc, elig, rev, proh, dg, maxv, sort] of cats) {
    await q(db,
      `INSERT INTO categories (tenant_id, code, name, description, traveler_eligible, requires_review,
                               prohibited, dangerous_goods, max_value_eur, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [T, code, name, desc, elig, rev, proh, dg, maxv, sort]);
  }

  // ---- Hubs ----
  await q(db,
    `INSERT INTO hubs (id, tenant_id, name, hub_type, country, city, address_text, services)
     VALUES ($1,$2,'PakketHub Amsterdam Zuidoost','HUB','NL','Amsterdam','Bijlmerdreef 100', $3)`,
    [HUB.AMS, T, ["INTAKE", "INSPECTION", "PACKING", "PICKUP", "CONSOLIDATION"]]);
  await q(db,
    `INSERT INTO hubs (id, tenant_id, name, hub_type, country, city, address_text, services)
     VALUES ($1,$2,'PakketHub Paramaribo Centrum','SERVICE_POINT','SR','Paramaribo','Domineestraat 12', $3)`,
    [HUB.PBM, T, ["PICKUP", "RETURNS"]]);

  // ---- Trip (traveler capacity) ----
  await q(db,
    `INSERT INTO trips (id, tenant_id, traveler_id, corridor_id, depart_date, arrive_date,
                        capacity_kg, price_indication_eur, notes, status)
     VALUES ($1,$2,$3,$4, current_date + interval '9 days', current_date + interval '10 days',
             12, 8.5, 'KLM ochtendvlucht, ruimte in ruimbagage.', 'OPEN')`,
    [TRIP, T, USER.TRAVELER, CORRIDOR]);

  // ---- Sample shipment (declared parcel, ALLOW) ----
  await q(db,
    `INSERT INTO shipments (id, tenant_id, reference, sender_id, corridor_id, service_mode,
       recipient_name, recipient_phone, recipient_city, recipient_country,
       declared_weight_kg, length_cm, width_cm, height_cm, is_sealed_closed, deadline,
       pickup_choice, notes, status, eligibility, total_declared_value_eur)
     VALUES ($1,$2,'PH-2026-000101',$3,$4,'CROWDSHIP',
       'R, Julen','+597700012345','Paramaribo','SR',
       3.5, 40, 30, 20, false, current_date + interval '12 days',
       'HUB_DROPOFF','Verjaardagscadeau voor familie.', 'QUOTED','ALLOW', 145)`,
    [SHIPMENT, T, USER.SENDER, CORRIDOR]);
  const items: [string, number, number, string][] = [
    ["Nieuwe kinderkleding (set)", 3, 25, "CLOTHING"],
    ["Verpakte koffie & snoep", 1, 20, "FOOD_DRY"],
    ["Verzorgingspakket (verzegeld)", 1, 50, "COSMETICS"],
  ];
  for (const [desc, qty, val, cat] of items) {
    await q(db,
      `INSERT INTO shipment_items (tenant_id, shipment_id, description, quantity, unit_value, currency, origin_country, category_code)
       VALUES ($1,$2,$3,$4,$5,'EUR','NL',$6)`,
      [T, SHIPMENT, desc, qty, val, cat]);
  }
  await q(db,
    `INSERT INTO eligibility_decisions (tenant_id, shipment_id, decision, reasons, rule_version, decided_by)
     VALUES ($1,$2,'ALLOW',$3,'v1',null)`,
    [T, SHIPMENT, JSON.stringify(["Alle items staan op de positieve lijst.",
      "Totale aangegeven waarde €145 ≤ corridorlimiet €250.", "Open, inspecteerbaar pakket."])]);

  // custody chain start
  const custody: [number, string, string | null, string | null, string | null][] = [
    [1, "CREATED", USER.SENDER, null, "Zending aangemaakt door afzender."],
    [2, "SCREENED", null, null, "Automatische eligibility: ALLOW."],
  ];
  for (const [seq, type, actor, hub, note] of custody) {
    await q(db,
      `INSERT INTO custody_events (tenant_id, shipment_id, seq, event_type, actor_id, hub_id, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [T, SHIPMENT, seq, type, actor, hub, note]);
  }

  // offer from traveler
  await q(db,
    `INSERT INTO offers (tenant_id, shipment_id, trip_id, traveler_id, price_eur, message, status)
     VALUES ($1,$2,$3,$4, 18.00, 'Ik vlieg over 9 dagen, kan dit meenemen. Ophalen bij hub AMS?', 'OPEN')`,
    [T, SHIPMENT, TRIP, USER.TRAVELER]);

  // ---- Conversation + chat between sender and traveler ----
  await q(db,
    `INSERT INTO conversations (id, tenant_id, shipment_id, subject, status, last_message_at)
     VALUES ($1,$2,$3,'Overleg PH-2026-000101','OPEN', now())`,
    [CONV, T, SHIPMENT]);
  await q(db,
    `INSERT INTO conversation_participants (conversation_id, user_id, party_role) VALUES ($1,$2,'SENDER')`,
    [CONV, USER.SENDER]);
  await q(db,
    `INSERT INTO conversation_participants (conversation_id, user_id, party_role) VALUES ($1,$2,'TRAVELER')`,
    [CONV, USER.TRAVELER]);

  const chat: [string | null, string, string][] = [
    [null, "SYSTEM", "Gesprek gestart voor zending PH-2026-000101. Maak hier je afspraken over ophalen, tijd en prijs. PakketHub houdt betaling vast tot bewijs van levering."],
    [USER.TRAVELER, "TEXT", "Hoi Sandra! Ik zag je zending. Ik vlieg volgende week woensdag. Zal ik het bij hub Amsterdam ophalen?"],
    [USER.SENDER, "TEXT", "Hi Winston, top! Ja, ik lever het dinsdag in bij de hub. Lukt €18 zoals je bod?"],
    [USER.TRAVELER, "TEXT", "Prima. Ik bevestig het bod. Kun je een verzegeld, open pakket aanleveren zodat de hub het kan inspecteren?"],
    [USER.SENDER, "TEXT", "Zeker, staat genoteerd. Dan stuur ik een voorstel voor de overdracht."],
  ];
  let ci = 0;
  for (const [sender, kind, body] of chat) {
    await q(db,
      `INSERT INTO chat_messages (tenant_id, conversation_id, sender_id, kind, body, created_at)
       VALUES ($1,$2,$3,$4,$5, now() - ($6 || ' minutes')::interval)`,
      [T, CONV, sender, kind, body, String((chat.length - ci) * 3)]);
    ci++;
  }

  // ---- Trust Center content ----
  const content: [string, string, string, string, string, string][] = [
    ["verificatie", "POLICY", "Verificatie & identiteit", "Waarom en hoe wij afzenders, reizigers en ontvangers verifiëren voordat waarde beweegt.", "PakketHub verifieert de identiteit van elke partij voordat een boeking of betaling plaatsvindt. Verificatie is verplicht voor waardebeweging en wordt periodiek herbeoordeeld.", "Compliance"],
    ["goederenbeleid", "POLICY", "Goederenbeleid & positieve lijst", "Wat mag wel en niet via een reiziger, en wat naar professionele freight gaat.", "Alleen categorieën op de positieve lijst mogen via crowdshipping. Onbekende, gesloten of gevaarlijke pakketten worden geweigerd of naar freight gerouteerd.", "Operations"],
    ["betalingen", "POLICY", "Betalingen & uitbetaling", "Beschermde betaling, houden van gelden en uitbetaling op basis van bewijs.", "Betalingen lopen via een gelicentieerde provider. Gelden worden vastgehouden en pas vrijgegeven na bewijs van levering (state-based payout release).", "Finance"],
    ["customs", "POLICY", "Douane & aangifte", "Verplichte itemaangifte en handmatige douanebeoordeling in de pilot.", "Elke zending vereist een volledige itemlijst. In de pilot beoordeelt een medewerker douanerelevante gevallen handmatig. PakketHub bepaalt geen douanelegaliteit namens de afzender.", "Compliance"],
    ["privacy", "POLICY", "Privacy", "Welke gegevens we verwerken en waarom.", "We verwerken alleen gegevens die nodig zijn voor verificatie, uitvoering en veiligheid van de zending, met bewaartermijnen en toegang op need-to-know-basis.", "DPO"],
    ["claims", "FAQ", "Claims & incidenten", "Hoe je een probleem, schade of zorg meldt.", "Meld schade of zorgen via het Trust Center of je zending. Bewijs (foto's, verzegeling, custody-log) wordt bewaard voor onderzoek.", "Support"],
  ];
  let si = 10;
  for (const [slug, kind, title, summary, body, owner] of content) {
    await q(db,
      `INSERT INTO content_items (tenant_id, slug, kind, title, summary, body, owner, review_date, status, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7, current_date + interval '180 days','PUBLISHED',$8)`,
      [T, slug, kind, title, summary, body, owner, si]);
    si += 10;
  }

  // ---- Wallets (leeg; vullen zich via finance-flow) ----
  for (const uid of [USER.TRAVELER, USER.SENDER]) {
    await q(db, `INSERT INTO wallets (tenant_id, user_id, balance_eur) VALUES ($1,$2,0)`, [T, uid]);
  }

  // ---- Notifications (demo-outbox) ----
  const notifs: [string, string, string][] = [
    ["Nieuw bod ontvangen", "Winston biedt €18 op je zending PH-2026-000101.", "OFFER_NEW"],
    ["Welkom bij PakketHub", "Je account is geverifieerd. Je kunt nu zendingen aanmaken en boeken.", "WELCOME"],
  ];
  for (const [title, body, tpl] of notifs) {
    await q(db,
      `INSERT INTO notifications (tenant_id, user_id, channel, template, title, body, status, provider)
       VALUES ($1,$2,'WHATSAPP',$3,$4,$5,'SENT','PakketHub Notify (sandbox)')`,
      [T, USER.SENDER, tpl, title, body]);
  }

  // ---- Jastip / shopping request (crowdshopping) ----
  await q(db,
    `INSERT INTO shopping_requests (tenant_id, requester_id, corridor_id, product_name, product_url,
        quantity, budget_eur, reward_eur, category_code, notes, status)
     VALUES ($1,$2,$3,'Nederlandse drop & hagelslag (pakket)','https://voorbeeld.nl/drop',
        2, 30, 12, 'FOOD_DRY', 'Graag Venco muntdrop erbij.', 'OPEN')`,
    [T, USER.SENDER, CORRIDOR]);

  // ---- Business account + API key + webhook (R2 Merchant/API) ----
  const BIZ = "17000000-0000-0000-0000-000000000a01";
  await q(db,
    `INSERT INTO business_accounts (id, tenant_id, name, vat_number, credit_limit_eur, status)
     VALUES ($1,$2,'Tori Retail NV','SR-VAT-4471', 2500, 'ACTIVE')`,
    [BIZ, T]);
  await q(db, `INSERT INTO business_members (business_id, user_id, role) VALUES ($1,$2,'OWNER')`, [BIZ, USER.ADMIN]);
  // Vaste demo-API-sleutel zodat de API in testen direct werkt.
  const apiPlain = "pk_sandbox_pakkethub_demo_key_2026";
  await q(db,
    `INSERT INTO api_keys (tenant_id, business_id, label, prefix, key_hash, scopes)
     VALUES ($1,$2,'Demo integratie','pk_sandbox',$3, $4)`,
    [T, BIZ, bcrypt.hashSync(apiPlain, 10), ["quote", "booking", "tracking"]]);
  await q(db,
    `INSERT INTO webhooks (tenant_id, business_id, url, events, secret, active)
     VALUES ($1,$2,'https://webhook.site/demo-pakkethub', $3, 'whsec_demo_secret', true)`,
    [T, BIZ, ["shipment.status", "booking.created", "payout.released"]]);

  // ---- Fleet, vehicle, driver (R2 Local Last Mile) ----
  const FLEET = "18000000-0000-0000-0000-000000000b01";
  await q(db,
    `INSERT INTO fleets (id, tenant_id, name, kyb_status, service_area, manager_id, status)
     VALUES ($1,$2,'Paramaribo Express','VERIFIED','Groot-Paramaribo',$3,'ACTIVE')`,
    [FLEET, T, USER.OPS]);
  await q(db,
    `INSERT INTO vehicles (tenant_id, fleet_id, plate, vehicle_type, capacity_kg, status)
     VALUES ($1,$2,'PK-1234','VAN', 800, 'AVAILABLE')`, [T, FLEET]);
  await q(db,
    `INSERT INTO drivers (tenant_id, fleet_id, name, phone, license_ref, status)
     VALUES ($1,$2,'Marlon Pinas','+597 712345','SR-DL-8890','ACTIVE')`, [T, FLEET]);

  await q(db,
    `INSERT INTO audit_log (tenant_id, user_id, action, entity_type, summary)
     VALUES ($1,$2,'SEED','system','PakketHub NL–SR pilot geseed (demo v0.2.0).')`,
    [T, USER.ADMIN]);
}
