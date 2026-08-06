# Changelog — PakketHub

## v0.3.0 — Meertaligheid (5 talen)

- **i18n-fundament**: taal-cookie + Accept-Language-detectie, woordenboeken per taal
  (`src/i18n`), server-helpers `getLocale()/getMessages()`, `<html lang>` volgt de taal,
  **taalwisselaar** in site-header, login, gate en app-sidebar. Geen route-verbouwing (staging blijft heel).
- **Talen**: 🇧🇷 Português (BR) · 🇪🇸 Español · 🇬🇧 English · 🇫🇷 Français · 🇳🇱 Nederlands.
- **Vertaald**: publieke homepage, header/footer/banner, login, staging-poort, app-navigatie,
  **Trust Center-content** (titel/samenvatting/beleidstekst per taal, i18n-JSON op de records).
- **Nog te vertalen (incrementeel)**: app-interne pagina's (zendingen, marktplaats, wallet,
  claims, shop, ops, freight, dispatch, business, analytics, control, console) + categorienamen.



## v0.2.2 — Staging-klaar (Coolify/Hetzner)

- **Dockerfile** (Next standalone) + **docker-compose.yml** (app + Postgres + volume) — Postgres-route
  getest op PG16: volledig schema + seed draaien foutloos (generated column, arrays, jsonb, interval).
- **Site-brede wachtwoordpoort** (`middleware.ts` + `/gate`), actief via env `STAGING_PASSWORD`;
  `/api/v1` uitgezonderd. Productie-build groen; gate end-to-end getest.
- **Hero-video geoptimaliseerd**: 37 MB → ~6 MB (1280p/H.264/+faststart) + poster-frame.
- `.env.example`, `DEPLOY.md` met Coolify-stappen. DB-backed publieke pagina's op `force-dynamic`.



## v0.2.1 — Officiële huisstijl + luchthaven-hero + video's

- **Herbouwd logo**: gesegmenteerde zeshoek met cadeau/pakket + strik, woordmerk PakketHub.
- **Merkkleuren** uit de huisstijl doorgevoerd (antraciet #2E2E2E, oranje #E9481C, beige #CDBFA7,
  bijna-zwart) — hele app van teal → oranje, PWA-iconen + theme-color vernieuwd.
- **Homepage-hero**: zelfstandige SVG-illustratie van een reiziger met koffer én pakket op de
  luchthaven, richting check-in.
- **Video's**: privacyvriendelijke sectie (youtube-nocookie, laadt pas na toestemming) met de twee
  aangeleverde video's.
- **Afgemaakt (bucket 2)**: retour-knop + retouroverzicht, zendingen aan consolidatie koppelen +
  verzegelen/verzenden, inspectie-checklist bij intake, fleet/voertuig/chauffeur-formulieren +
  KYB-goedkeuring, printbaar **verzendlabel** (pseudo-barcode/QR) + volumetrisch gewicht.



## v0.2.0 — Volledige afbouw tot de integratiegrenzen (R1-finance + R2 + R3, gesimuleerd)

Alle resterende domeinen afgebouwd tot waar een echte externe integratie nodig is; op elke
grens draait een **simulatie-adapter** + een **Test Console** om de flow in testen te tonen.

### Adapters (integratiegrenzen — `src/lib/adapters`)
- **Payments** — `PakketHub Pay (sandbox)`: payment intents, escrow-hold, uitbetaling, refund, FX.
  Vervangbaar door Mollie/Stripe/gelicentieerde escrow zonder de app te wijzigen.
- **KYC** — sandbox IDV: start → beslissing (goedkeuren/afwijzen).
- **Notifications** — sandbox WhatsApp/e-mail outbox.
- **Routing** — deterministische ETA + dispatch-bundeling.
- **AI assist** — categorie-suggestie + support-conceptantwoord (mag engine/uitbetaling niet overrulen).

### Finance (R1 WP-04)
- Checkout op booking → **escrow** (double-entry grootboek), **uitbetaling** na levering,
  **refund** bij toegekende claim; wallet-saldi; servicekosten (take rate). Demo-betaalpagina.
- Grootboek is aantoonbaar in balans (geverifieerd: escrow → wallet + fee, som = 0).

### Nieuwe domeinen
- **Claims, disputes & retour** (WP-08) — met berichten, AI-conceptantwoord en refund-afhandeling.
- **Purchase & Proof / jastip** (WP-05) — shop-verzoeken: reiziger koopt product + bon als bewijs.
- **Warehouse & managed freight** (WP-10) — consolidaties + freight-orders (ETA via routing).
- **Fleet & dispatch** (WP-11) — fleets/voertuigen/chauffeurs + dispatch-workbench (last mile).
- **Business & API** (WP-12) — zakelijk account, API-sleutels, **publieke REST API**
  (`/api/v1/quote`, `/api/v1/track/[ref]`, Bearer-auth + scopes) en **webhook-simulator**.
- **Analytics & unit economics** (WP-13) — GMV, take rate, escrow, leverratio, claimratio.
- **KYC-onboarding** + **notificatie-inbox** + **wallet**-overzicht in de app.
- **Test / Simulatie Console** — drijf betalingen, KYC, levering, corridors en webhooks aan.
- White-label: corridor-activatie (PLANNED/PILOT/LIVE/PAUSED).

### Verificatie
Typecheck schoon; alle nieuwe pagina's 200; publieke API (quote ALLOW+prijs, verboden→REJECT,
track, 401 zonder sleutel) getest; finance-flow end-to-end met sluitend grootboek.

## v0.1.0 — Fundering (R0 Trust & Compliance + R1 NL-SR Jastip Core)

Eerste werkende voorvertoning van pakkethub.com (domein nog niet geactiveerd).

### Toegevoegd
- **Chassis**: Next.js 15 App Router, PGlite/Postgres dual-driver, cookie-sessies, RBAC met
  capabilities, audit-log, single-tenant PakketHub met NL–SR pilotcorridor. Poort 3070.
- **Installeerbare PWA** (downloadbare web-app voor elk toestel): `manifest.webmanifest`,
  service worker (`sw.js`) met offline app-shell, install-knop met iOS-instructie, app-shortcuts.
- **Publieke website** (staged): homepage, hoe-het-werkt (per persona), verzenden met
  eligibility-/prijscalculator, prijzen, **Trust Center** (beleidsdocumenten), track & trace op
  referentie, partner-werving met lead-capture. Preview-banner + `noindex` tot livegang.
- **Deterministische eligibility-engine** (`rule_version v1`): positieve lijst, mystery-package
  gate, gevaarlijke-goederen-routing, waarde-/aantal-/gewichtslimieten →
  `ALLOW/STEP_UP/REVIEW/HOLD/FREIGHT_ONLY/REJECT`, met persistente beslissingen + inputs-hash.
- **Marktplaats**: zending aanmaken met itemaangifte en live-beoordeling, ritten publiceren,
  bieden, bod accepteren → booking met vastgehouden betaling (release na levering).
- **Chat tussen de partijen**: per-zending gesprek sender ⇄ reiziger, near-real-time (polling),
  optimistisch versturen, **afspraken** (plaats/tijd/prijs) voorstellen en bevestigen.
- **Chain of custody**: append-only events; levenscyclus Draft → … → Delivered met status-acties.
- **Hub & intake**-werklijst en hubs/service points.
- **Control Center**: beoordelingswachtrij, handmatige override (reden verplicht, four-eyes,
  gelogd), kill switch per corridor, KRI-tegels, audit-overzicht.

### Nog niet in deze golf (zie docs/BASELINE-TRACEABILITY.md)
Fleet/dispatch, multimodale orkestratie, managed freight, zakelijke accounts + API/webhooks,
lockers, echte KYC-/betaal-/kaartadapters, video-CMS. Gemodelleerd op corridor-/mode-niveau,
gemarkeerd als *planned* — niet als gereed voorgesteld.
