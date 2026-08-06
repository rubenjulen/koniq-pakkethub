# PakketHub — staging deployen (Coolify op Hetzner)

Doel: een besloten testomgeving waar compagnons de functionaliteiten testen. Externe
providers (betalen/KYC/notificaties) draaien in **simulatie** — testen zonder echt geld
of contracten, aangedreven via de **Test Console** (`/app/console`, admin).

## 1. Voorbereiding
- De app bouwt als **Next.js standalone** (zie `Dockerfile`). Geen native dependencies.
- De demo-database is **PGlite** in `PGLITE_DIR`. Mount daar een **persistent volume**
  zodat testdata blijft staan bij herstart. (Of gebruik Postgres — zie §4.)

## 2. Coolify — nieuwe resource
1. **New Resource → Application → Dockerfile** (of Git-repo met deze `Dockerfile`).
2. **Build**: Dockerfile (root van `pakkethub-app`). Poort **3070**.
3. **Persistent Storage**: voeg een volume toe, mount path **`/data`**
   (de database komt in `/data/pgdata`).
4. **Environment variables** (zie `.env.example`):
   - `STAGING_PASSWORD` = een sterk wachtwoord (de site-brede poort).
   - `PGLITE_DIR=/data/pgdata`
   - `SEED_ON_BOOT=true` (maakt de demo-accounts aan bij eerste boot)
   - `NODE_ENV=production` (zet Coolify meestal zelf)
5. **Domain**: koppel bijv. `staging.pakkethub.com` via Cloudflare (DNS → Coolify),
   HTTPS/Let's Encrypt aan. `robots.txt` staat al op *noindex*.
6. **Deploy**.

## 3. Eerste keer inloggen
1. Open de URL → je krijgt de **staging-poort**; vul `STAGING_PASSWORD` in.
2. Log in met een demo-account (wachtwoord `demo12345`):
   - `sender@pakkethub.com` — afzender
   - `traveler@pakkethub.com` — reiziger
   - `hub@pakkethub.com` — hub/operatie
   - `admin@pakkethub.com` — beheer (Control Center + **Test Console**)
3. Testscenario end-to-end: afzender maakt zending → reiziger biedt → afzender
   accepteert → demo-betaalpagina → admin **Test Console** → "Simuleer levering" →
   uitbetaling in wallet.

## 4. (Aanrader) Duurzame data met Postgres — via docker-compose
Voor data die **elke redeploy overleeft** is Postgres beter dan PGlite. De meegeleverde
`docker-compose.yml` draait **app + Postgres + volume** in één keer. De Postgres-route is
getest: het volledige schema + de seed draaien foutloos op Postgres 16.

**Coolify:** New Resource → **Docker Compose** → wijs naar deze repo. Zet env
`DB_PASSWORD` en `STAGING_PASSWORD`. Klaar — data staat in het `pgdata`-volume.

**Lokaal proberen:**
```
DB_PASSWORD=phpass STAGING_PASSWORD=test docker compose up -d --build
```
Open daarna http://localhost:3070 . (Bij deze route heb je `PGLITE_DIR` niet nodig.)

## 5. Handig
- **Publieke API testen** (buiten de poort om): endpoints onder `/api/v1` zijn
  uitgezonderd van de staging-poort en gebruiken de API-sleutel
  (`pk_sandbox_pakkethub_demo_key_2026`). Zie de Business & API-pagina.
- **Data resetten**: leeg het volume `/data` (of drop de Postgres-DB) en redeploy —
  de seed draait opnieuw.
- **Hero-video** is geoptimaliseerd naar ~6 MB (1280p, H.264, +faststart) met een poster-frame
  (`public/media/hero-poster.jpg`) voor directe weergave. Nieuwe video comprimeren:
  `ffmpeg -i in.mp4 -vf scale=1280:-2 -c:v libx264 -crf 28 -an -movflags +faststart public/media/hero.mp4`

## 6. Let op (staging ≠ productie)
- De staging-poort is een lichte drempel, geen volwaardige beveiliging.
- Demo-accounts + sandbox-API-sleutel staan aan — prima voor test, uit vóór echte livegang.
- Geen "99% veiliger"-claims; echte betaal-/KYC-/douane-integraties en de go-live-gates
  horen bij de échte livegang (zie `docs/BASELINE-TRACEABILITY.md`).
