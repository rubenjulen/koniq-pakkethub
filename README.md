# PakketHub — corridor-crowdshipping platform (v0.1.0)

Werkende voorvertoning van **PakketHub.com**: publieke website + installeerbare web-app (PWA) +
marktplaats met **chat tussen afzender en reiziger**. Gebouwd op de KoniQ-chassis
(Next.js 15 App Router + PGlite/Postgres dual-driver, cookie-sessies, RBAC, audit).

> **Domein `pakkethub.com` is bewust nog niet geactiveerd.** De app draait lokaal en is
> livegang-klaar; een oranje preview-banner en `robots: noindex` markeren de staging-status.

## Waarom deze scope

Het aangeleverde *Build-Ready Requirement Baseline v2.0* bevat **496 requirements** over 5
operating modes (crowdshopping, declared parcel, fleet, hub/consolidation, managed freight).
Dat is een meerjarig programma. Deze v0.1.0 levert een **echte, draaiende fundering** voor de
eerste twee golven uit de roadmap — **R0 Trust & Compliance** en **R1 NL-SR Jastip Core** — met
de drie expliciet gevraagde onderdelen volledig werkend. Zie
[`docs/BASELINE-TRACEABILITY.md`](docs/BASELINE-TRACEABILITY.md) voor wat live is vs. gepland.

## De drie kernvragen — status

| Vraag | Status |
|---|---|
| App + domein dat later activeert (pakkethub.com) | ✅ Website + app gebouwd, domein niet geactiveerd (noindex + banner) |
| Downloadbare web-apps voor elk toestel | ✅ Installeerbare PWA (manifest + service worker + install-knop, iOS-instructie) |
| Chat waarin de partijen overleggen en afspreken | ✅ Per-zending chat sender ⇄ reiziger, near-real-time, met bevestigbare afspraken |

## Snel starten

```bash
npm install
npm run dev      # http://localhost:3070
```

Geen database-setup nodig: zonder `DATABASE_URL` draait een ingebedde **PGlite** met
automatische seed. Voor productie: zet `DATABASE_URL` (Postgres/Supabase) — zelfde SQL.

### Demo-accounts (wachtwoord: `demo12345`)

| Rol | E-mail | Kan |
|---|---|---|
| Afzender | `sender@pakkethub.com` | Zendingen aanmaken, bod accepteren, chatten, volgen |
| Reiziger | `traveler@pakkethub.com` | Ritten publiceren, bieden, chatten, afspraken maken |
| Hub / operatie | `hub@pakkethub.com` | Intake, inspectie, verzegeling, custody |
| Platformbeheer | `admin@pakkethub.com` | Control Center: beoordeling, kill switches, audit |

## Kernconcepten (het risk-control-spine)

- **Positieve lijst** — alleen goedgekeurde categorieën mogen via een reiziger; deterministische
  eligibility-engine (`src/lib/eligibility.ts`, `rule_version v1`) → `ALLOW / STEP_UP / REVIEW /
  HOLD / FREIGHT_ONLY / REJECT`. Beslissingen worden persistent gelogd met inputs-hash.
- **Mystery-package gate** — gesloten, niet-inspecteerbare pakketten → alleen freight.
- **Geverifieerde identiteit** vóór waardebeweging (KYC-status op de gebruiker).
- **Append-only chain of custody** (`custody_events`, oplopend volgnummer).
- **Beschermde betaling** — bij boeking `HELD`, pas `RELEASED` na status `DELIVERED`.
- **Chat + afspraken** — `conversations` / `chat_messages` / `agreements`; voorstel → bevestigen.
- **Control Center** — beoordelingswachtrij, handmatige override (reden verplicht, gelogd),
  kill switch per corridor, audit-trail.

## Structuur

```
src/
  app/
    (site)/            # publieke website pakkethub.com (home, hoe-het-werkt, verzenden,
                       #   prijzen, trust, track, partner)
    app/               # ingelogde app (dashboard, shipments, marketplace, trips,
                       #   messages/chat, ops, control)
    api/conversations/ # REST-endpoints voor de near-real-time chat + afspraken
    login, offline
  components/          # UI, Logo, ChatThread, NewShipmentForm, QuoteCalculator, PWA
  db/                  # schema.sql (+ gegenereerde schema-sql.ts), client (dual driver), seed
  lib/                 # auth, rbac, eligibility, shipments, chat, tenant, audit, format, nav
public/                # manifest.webmanifest, sw.js, icons/, robots.txt (noindex)
```

## Productie / livegang

`next build` bundelt het schema (`prebuild` → `gen:schema`). Standalone output. Vóór activatie van
`pakkethub.com`: `DATABASE_URL` zetten, `robots` op index, echte KYC/betaal/kaart-adapters koppelen,
en de go-live-gates uit de baseline aflopen. Zie `docs/BASELINE-TRACEABILITY.md`.
