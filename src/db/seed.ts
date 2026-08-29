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
    [T, "BugaWuga", "pakkethub", "Europe/Amsterdam", "EUR",
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
     VALUES ($1,$2,'BugaWuga Amsterdam Zuidoost','HUB','NL','Amsterdam','Bijlmerdreef 100', $3)`,
    [HUB.AMS, T, ["INTAKE", "INSPECTION", "PACKING", "PICKUP", "CONSOLIDATION"]]);
  await q(db,
    `INSERT INTO hubs (id, tenant_id, name, hub_type, country, city, address_text, services)
     VALUES ($1,$2,'BugaWuga Paramaribo Centrum','SERVICE_POINT','SR','Paramaribo','Domineestraat 12', $3)`,
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
    [null, "SYSTEM", "Gesprek gestart voor zending PH-2026-000101. Maak hier je afspraken over ophalen, tijd en prijs. BugaWuga houdt betaling vast tot bewijs van levering."],
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

  // ---- Trust Center content (5 talen) ----
  type Tr = { title: string; summary: string; body: string };
  type Doc = { slug: string; kind: string; owner: string; t: Record<string, Tr> };
  const content: Doc[] = [
    { slug: "verificatie", kind: "POLICY", owner: "Compliance", t: {
      nl: { title: "Verificatie & identiteit", summary: "Waarom en hoe wij afzenders, reizigers en ontvangers verifiëren voordat waarde beweegt.", body: "BugaWuga verifieert de identiteit van elke partij voordat een boeking of betaling plaatsvindt. Verificatie is verplicht voor waardebeweging en wordt periodiek herbeoordeeld." },
      en: { title: "Verification & identity", summary: "Why and how we verify senders, travelers and recipients before value moves.", body: "BugaWuga verifies the identity of every party before a booking or payment takes place. Verification is required for any value movement and is periodically re-reviewed." },
      pt: { title: "Verificação e identidade", summary: "Por que e como verificamos remetentes, viajantes e destinatários antes de qualquer valor se mover.", body: "A BugaWuga verifica a identidade de cada parte antes de uma reserva ou pagamento. A verificação é obrigatória para qualquer movimentação de valor e é reavaliada periodicamente." },
      es: { title: "Verificación e identidad", summary: "Por qué y cómo verificamos a remitentes, viajeros y destinatarios antes de mover valor.", body: "BugaWuga verifica la identidad de cada parte antes de una reserva o pago. La verificación es obligatoria para cualquier movimiento de valor y se revisa periódicamente." },
      fr: { title: "Vérification et identité", summary: "Pourquoi et comment nous vérifions expéditeurs, voyageurs et destinataires avant tout mouvement de valeur.", body: "BugaWuga vérifie l'identité de chaque partie avant toute réservation ou paiement. La vérification est obligatoire pour tout mouvement de valeur et est réévaluée périodiquement." } } },
    { slug: "goederenbeleid", kind: "POLICY", owner: "Operations", t: {
      nl: { title: "Goederenbeleid & positieve lijst", summary: "Wat mag wel en niet via een reiziger, en wat naar professionele freight gaat.", body: "Alleen categorieën op de positieve lijst mogen via crowdshipping. Onbekende, gesloten of gevaarlijke pakketten worden geweigerd of naar freight gerouteerd." },
      en: { title: "Goods policy & positive list", summary: "What can and cannot travel with a traveler, and what goes to professional freight.", body: "Only categories on the positive list may travel via crowdshipping. Unknown, closed or dangerous packages are refused or routed to freight." },
      pt: { title: "Política de mercadorias e lista positiva", summary: "O que pode e o que não pode viajar com um viajante, e o que vai para o frete profissional.", body: "Apenas as categorias da lista positiva podem viajar via crowdshipping. Pacotes desconhecidos, fechados ou perigosos são recusados ou encaminhados para o frete." },
      es: { title: "Política de mercancías y lista positiva", summary: "Qué puede y qué no viajar con un viajero, y qué va a flete profesional.", body: "Solo las categorías de la lista positiva pueden viajar vía crowdshipping. Los paquetes desconocidos, cerrados o peligrosos se rechazan o se derivan a flete." },
      fr: { title: "Politique des marchandises et liste positive", summary: "Ce qui peut ou non voyager avec un voyageur, et ce qui part en fret professionnel.", body: "Seules les catégories de la liste positive peuvent voyager via le crowdshipping. Les colis inconnus, fermés ou dangereux sont refusés ou orientés vers le fret." } } },
    { slug: "betalingen", kind: "POLICY", owner: "Finance", t: {
      nl: { title: "Betalingen & uitbetaling", summary: "Beschermde betaling, houden van gelden en uitbetaling op basis van bewijs.", body: "Betalingen lopen via een gelicentieerde provider. Gelden worden vastgehouden en pas vrijgegeven na bewijs van levering (state-based payout release)." },
      en: { title: "Payments & payout", summary: "Protected payment, holding of funds and payout based on proof.", body: "Payments run through a licensed provider. Funds are held and only released after proof of delivery (state-based payout release)." },
      pt: { title: "Pagamentos e repasse", summary: "Pagamento protegido, retenção de fundos e repasse mediante prova.", body: "Os pagamentos passam por um provedor licenciado. Os fundos ficam retidos e só são liberados após a prova de entrega." },
      es: { title: "Pagos y liquidación", summary: "Pago protegido, retención de fondos y liquidación basada en pruebas.", body: "Los pagos pasan por un proveedor con licencia. Los fondos se retienen y solo se liberan tras la prueba de entrega." },
      fr: { title: "Paiements et versement", summary: "Paiement protégé, blocage des fonds et versement sur preuve.", body: "Les paiements passent par un prestataire agréé. Les fonds sont bloqués et libérés uniquement après preuve de livraison." } } },
    { slug: "customs", kind: "POLICY", owner: "Compliance", t: {
      nl: { title: "Douane & aangifte", summary: "Verplichte itemaangifte en handmatige douanebeoordeling in de pilot.", body: "Elke zending vereist een volledige itemlijst. In de pilot beoordeelt een medewerker douanerelevante gevallen handmatig. BugaWuga bepaalt geen douanelegaliteit namens de afzender." },
      en: { title: "Customs & declaration", summary: "Mandatory item declaration and manual customs review during the pilot.", body: "Every shipment requires a complete item list. During the pilot, a staff member manually reviews customs-relevant cases. BugaWuga does not determine customs legality on behalf of the sender." },
      pt: { title: "Alfândega e declaração", summary: "Declaração obrigatória de itens e revisão aduaneira manual no piloto.", body: "Cada envio exige uma lista completa de itens. No piloto, um funcionário analisa manualmente os casos relevantes para a alfândega. A BugaWuga não determina a legalidade aduaneira em nome do remetente." },
      es: { title: "Aduana y declaración", summary: "Declaración de artículos obligatoria y revisión aduanera manual en el piloto.", body: "Cada envío requiere una lista completa de artículos. En el piloto, un empleado revisa manualmente los casos relevantes para aduanas. BugaWuga no determina la legalidad aduanera en nombre del remitente." },
      fr: { title: "Douane et déclaration", summary: "Déclaration d'articles obligatoire et examen douanier manuel pendant le pilote.", body: "Chaque envoi exige une liste complète des articles. Pendant le pilote, un agent examine manuellement les cas relevant de la douane. BugaWuga ne détermine pas la légalité douanière au nom de l'expéditeur." } } },
    { slug: "privacy", kind: "POLICY", owner: "DPO", t: {
      nl: { title: "Privacy", summary: "Welke gegevens we verwerken en waarom.", body: "We verwerken alleen gegevens die nodig zijn voor verificatie, uitvoering en veiligheid van de zending, met bewaartermijnen en toegang op need-to-know-basis." },
      en: { title: "Privacy", summary: "What data we process and why.", body: "We only process data needed for verification, execution and safety of the shipment, with retention periods and access on a need-to-know basis." },
      pt: { title: "Privacidade", summary: "Quais dados processamos e por quê.", body: "Processamos apenas os dados necessários para verificação, execução e segurança do envio, com prazos de retenção e acesso restrito ao necessário." },
      es: { title: "Privacidad", summary: "Qué datos procesamos y por qué.", body: "Solo procesamos los datos necesarios para la verificación, ejecución y seguridad del envío, con plazos de conservación y acceso según lo necesario." },
      fr: { title: "Confidentialité", summary: "Quelles données nous traitons et pourquoi.", body: "Nous ne traitons que les données nécessaires à la vérification, à l'exécution et à la sécurité de l'envoi, avec des durées de conservation et un accès limité au strict nécessaire." } } },
    { slug: "claims", kind: "FAQ", owner: "Support", t: {
      nl: { title: "Claims & incidenten", summary: "Hoe je een probleem, schade of zorg meldt.", body: "Meld schade of zorgen via het Trust Center of je zending. Bewijs (foto's, verzegeling, custody-log) wordt bewaard voor onderzoek." },
      en: { title: "Claims & incidents", summary: "How to report a problem, damage or concern.", body: "Report damage or concerns via the Trust Center or your shipment. Evidence (photos, seal, custody log) is retained for investigation." },
      pt: { title: "Reclamações e incidentes", summary: "Como relatar um problema, dano ou preocupação.", body: "Relate danos ou preocupações pela Central de Confiança ou pelo seu envio. As provas (fotos, lacre, log de custódia) são guardadas para investigação." },
      es: { title: "Reclamaciones e incidentes", summary: "Cómo informar de un problema, daño o inquietud.", body: "Informa de daños o inquietudes mediante el Centro de Confianza o tu envío. Las pruebas (fotos, precinto, log de custodia) se conservan para la investigación." },
      fr: { title: "Réclamations et incidents", summary: "Comment signaler un problème, un dommage ou une inquiétude.", body: "Signalez les dommages ou inquiétudes via le Centre de Confiance ou votre envoi. Les preuves (photos, scellé, journal de traçabilité) sont conservées pour enquête." } } },
  ];
  let si = 10;
  for (const doc of content) {
    const base = doc.t.nl;
    const titleI18n: Record<string, string> = {}, sumI18n: Record<string, string> = {}, bodyI18n: Record<string, string> = {};
    for (const [lc, tr] of Object.entries(doc.t)) { titleI18n[lc] = tr.title; sumI18n[lc] = tr.summary; bodyI18n[lc] = tr.body; }
    await q(db,
      `INSERT INTO content_items (tenant_id, slug, kind, title, summary, body, title_i18n, summary_i18n, body_i18n, owner, review_date, status, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, current_date + interval '180 days','PUBLISHED',$11)`,
      [T, doc.slug, doc.kind, base.title, base.summary, base.body,
       JSON.stringify(titleI18n), JSON.stringify(sumI18n), JSON.stringify(bodyI18n), doc.owner, si]);
    si += 10;
  }

  // ---- Video-content (CMS): YouTube-id in body, meertalige titel ----
  const videos: [string, string, Record<string, string>][] = [
    ["video-1", "O_RucR2okRY", {
      nl: "BugaWuga — zo werkt gecontroleerde corridor-crowdshipping",
      en: "BugaWuga — how controlled corridor crowdshipping works",
      pt: "BugaWuga — como funciona o crowdshipping de corredor controlado",
      es: "BugaWuga — cómo funciona el crowdshipping de corredor controlado",
      fr: "BugaWuga — comment fonctionne le crowdshipping de corridor contrôlé" }],
    ["video-2", "z2wXH9ZCQSM", {
      nl: "Van aangifte tot levering: de reis van je pakket",
      en: "From declaration to delivery: your package's journey",
      pt: "Da declaração à entrega: a jornada do seu pacote",
      es: "De la declaración a la entrega: el viaje de tu paquete",
      fr: "De la déclaration à la livraison : le voyage de votre colis" }],
  ];
  let vi = 5;
  for (const [slug, ytId, titles] of videos) {
    await q(db,
      `INSERT INTO content_items (tenant_id, slug, kind, title, body, title_i18n, status, sort_order)
       VALUES ($1,$2,'VIDEO',$3,$4,$5,'PUBLISHED',$6)`,
      [T, slug, titles.nl, ytId, JSON.stringify(titles), vi]);
    vi += 1;
  }

  // ---- Wallets (leeg; vullen zich via finance-flow) ----
  for (const uid of [USER.TRAVELER, USER.SENDER]) {
    await q(db, `INSERT INTO wallets (tenant_id, user_id, balance_eur) VALUES ($1,$2,0)`, [T, uid]);
  }

  // ---- Notifications (demo-outbox) ----
  const notifs: [string, string, string][] = [
    ["Nieuw bod ontvangen", "Winston biedt €18 op je zending PH-2026-000101.", "OFFER_NEW"],
    ["Welkom bij BugaWuga", "Je account is geverifieerd. Je kunt nu zendingen aanmaken en boeken.", "WELCOME"],
  ];
  for (const [title, body, tpl] of notifs) {
    await q(db,
      `INSERT INTO notifications (tenant_id, user_id, channel, template, title, body, status, provider)
       VALUES ($1,$2,'WHATSAPP',$3,$4,$5,'SENT','BugaWuga Notify (sandbox)')`,
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

  // =========================================================================
  //  v0.3 (bucket 3) demo-data: legs/manifest, locker, tijdslots, boeken
  // =========================================================================

  // ---- Multimodale legs voor de voorbeeldzending + een manifest (vlucht) ----
  const MANIFEST = "19000000-0000-0000-0000-000000000c01";
  await q(db,
    `INSERT INTO manifests (id, tenant_id, reference, mode, carrier_type, carrier_ref, trip_id, origin_hub_id, dest_hub_id, depart_at, status)
     VALUES ($1,$2,'MF-2026-0001','AIR','TRAVELER','KL-713',$3,$4,$5, now() + interval '10 days','SEALED')`,
    [MANIFEST, T, TRIP, HUB.AMS, HUB.PBM]);
  const legs: [number, string, string, string, string, string, string | null, string | null, string | null][] = [
    // seq, leg_type, mode, from_label, to_label, carrier_type, from_hub, to_hub, manifest
    [1, "PICKUP",      "ROAD",     "Afzender (thuis)",  "Hub Amsterdam",     "FLEET",    null,    HUB.AMS, null],
    [2, "LINEHAUL",    "AIR",      "Hub Amsterdam",     "Hub Paramaribo",    "TRAVELER", HUB.AMS, HUB.PBM, MANIFEST],
    [3, "CUSTOMS",     "AIR",      "Douane Zanderij",   "Hub Paramaribo",    "HUB",      HUB.PBM, HUB.PBM, null],
    [4, "DELIVERY",    "ROAD",     "Hub Paramaribo",    "Ontvanger (thuis)", "FLEET",    HUB.PBM, null,    null],
  ];
  for (const [seq, lt, mode, fl, tl, ct, fh, th, mf] of legs) {
    await q(db,
      `INSERT INTO shipment_legs (tenant_id, shipment_id, seq, leg_type, mode, from_label, to_label, carrier_type, from_hub_id, to_hub_id, manifest_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, $12)`,
      [T, SHIPMENT, seq, lt, mode, fl, tl, ct, fh, th, mf, seq === 1 ? "COMPLETED" : "PLANNED"]);
  }

  // ---- Locker met compartimenten in Paramaribo ----
  const LOCKER = "1a000000-0000-0000-0000-000000000d01";
  await q(db,
    `INSERT INTO lockers (id, tenant_id, hub_id, code, name, address, city, country, status)
     VALUES ($1,$2,$3,'LK-PBM-01','BugaWuga Locker Centrum','Domineestraat 12','Paramaribo','SR','ACTIVE')`,
    [LOCKER, T, HUB.PBM]);
  const comps: [string, string, string][] = [
    ["A1", "S", "FREE"], ["A2", "S", "FREE"], ["B1", "M", "OCCUPIED"],
    ["B2", "M", "FREE"], ["C1", "L", "RESERVED"], ["C2", "XL", "FREE"],
  ];
  for (const [label, size, st] of comps) {
    await q(db,
      `INSERT INTO locker_compartments (tenant_id, locker_id, label, size, status, shipment_id, pin_code)
       VALUES ($1,$2,$3,$4,$5, $6, $7)`,
      [T, LOCKER, label, size, st, st === "OCCUPIED" ? SHIPMENT : null, st === "OCCUPIED" ? "4821" : null]);
  }

  // ---- Tijdslots (intake/afgifte) voor de komende dagen ----
  for (let d = 1; d <= 4; d++) {
    for (const [h, type] of [[9, "DROPOFF"], [13, "INTAKE"], [16, "PICKUP"]] as [number, string][]) {
      await q(db,
        `INSERT INTO timeslots (tenant_id, hub_id, slot_type, starts_at, ends_at, capacity, booked)
         VALUES ($1,$2,$3,
                 date_trunc('day', now()) + make_interval(days => $4::int, hours => $5::int),
                 date_trunc('day', now()) + make_interval(days => $4::int, hours => $6::int),
                 5, $7::int)`,
        [T, HUB.AMS, type, d, h, h + 2, d === 1 && h === 9 ? 2 : 0]);
    }
  }

  // ---- Adresboek + productboek voor de afzender ----
  await q(db,
    `INSERT INTO address_book (tenant_id, owner_id, label, name, phone, line1, city, country, postal, is_default)
     VALUES ($1,$2,'Familie Paramaribo','R, Julen','+597700012345','Kwattaweg 155','Paramaribo','SR',NULL,true),
            ($1,$2,'Neef Nickerie','A, Amatstan','+597850067','Waldeckstraat 3','Nieuw-Nickerie','SR',NULL,false)`,
    [T, USER.SENDER]);
  await q(db,
    `INSERT INTO product_book (tenant_id, owner_id, name, category_code, default_value_eur, default_weight_kg, hs_code)
     VALUES ($1,$2,'Kinderkleding set','CLOTHING',25,0.6,'6209'),
            ($1,$2,'Verpakte koffie 500g','FOOD_DRY',8,0.5,'0901'),
            ($1,$2,'Vitaminen (verzegeld)','HEALTH',15,0.3,'2106')`,
    [T, USER.SENDER]);

  await q(db,
    `INSERT INTO audit_log (tenant_id, user_id, action, entity_type, summary)
     VALUES ($1,$2,'SEED','system','BugaWuga NL–SR pilot geseed (demo v0.3.0: legs/manifests, lockers, slots, boeken).')`,
    [T, USER.ADMIN]);
}
