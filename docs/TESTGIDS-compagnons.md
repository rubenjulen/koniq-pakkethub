# BugaWuga — testgids

Welkom bij de test van **BugaWuga** (corridor-crowdshipping, pilot Nederland → Suriname).
Alles draait op een **testomgeving** (staging) met **simulaties** in plaats van echte
betaal-/verificatie-/bezorgkoppelingen — er wordt dus **geen echt geld** verplaatst en er
worden geen echte berichten verstuurd.

> **Feedback graag via de 💬 Feedback-knop rechtsonder in de app** (zie §5). Dan komt alles
> gebundeld binnen bij het team.

---

## 1. Inloggen op de testomgeving

- **URL:** https://pakkethub.koniq.app  *(het domein pakkethub.com wordt later geactiveerd)*
- Eerst zie je een **wachtwoordpoort** (site-brede staging-beveiliging). Vul het gedeelde
  staging-wachtwoord in dat je van Ruben/Winston hebt gekregen. *(Dit is de poort, niet je account.)*
- Daarna kom je op de publieke website. Rechtsboven kun je:
  - **Taal** kiezen: 🇳🇱 Nederlands · 🇬🇧 English · 🇪🇸 Español · 🇧🇷 Português · 🇫🇷 Français · 🇨🇳 中文
  - **Thema** kiezen (één knopje: licht → donker → automatisch)
  - **App installeren** (PWA) — op mobiel verschijnt de installknop direct in de bovenbalk.

### Demo-accounts (wachtwoord voor allemaal: `demo12345`)

| Rol | E-mail | Wat je test |
|-----|--------|-------------|
| Afzender | `sender@pakkethub.com` | Pakket aanmelden, aanbod ontvangen, chatten, betalen (sim), boeken/producten |
| Reiziger | `traveler@pakkethub.com` | Rit publiceren, bieden op zendingen, chatten |
| Hub / operatie | `hub@pakkethub.com` | Intake, inspectie & zegel, manifesten, lockers, dispatch |
| Beheer (admin) | `admin@pakkethub.com` | Alles + Control Center, analytics, video-CMS, test-console, **feedback bekijken** |

> Tip: log in twee browsers (of één normaal + één incognito) in als **afzender** én **reiziger**
> tegelijk, zodat je de chat en het bieden tussen twee partijen live ziet.

---

## 2. Snelle route (± 5 min) — de kern in het kort

1. **Publieke site** — bekijk op de homepage de **"Nu beschikbaar"**-kaartjes en de live-teller in
   de hero, of open **Ontdek** in het menu: wie biedt ruimte aan / wil iets sturen (anoniem).
2. Log in als **afzender**. Doe op **Verzenden** de **gratis check** (inhoud + gewicht → mag het
   mee + prijsindicatie).
3. Open op je **Overzicht** de demo-zending **PH-2026-000102** — die is al **onderweg (READY)**.
   Je ziet de **custody-tijdlijn** en de **ontvangstcode `834217`** (die geef je aan de ontvanger).
4. Log in tweede browser in als **reiziger** en bekijk hoe bieden + chat werkt op een open zending.
5. Klik ergens op de **💬 Feedback**-knop en stuur je eerste opmerking in.

---

## 3. Demo-scenario's per rol

### A. Afzender — pakket aanmelden tot betaling
1. Log in als **sender@**.
2. **Verzenden** (publiek) of **+ Pakket versturen** (in de app): geef corridor NL→SR, ontvanger,
   gewicht en de **inhoud per item** op. Je ziet meteen de **eligibility-check** (toegestaan /
   beoordelen / freight / geweigerd) — de deterministische regelmotor.
3. Open de zending. Zet 'm **zichtbaar** op de marktplaats — en eventueel **"ook anoniem op de
   publieke website"** (dan verschijnt hij geanonimiseerd op Ontdek).
4. Zodra een reiziger biedt (rol B) opent automatisch een **chat**. Gebruik de **standaardvragen**
   (snelkeuze) en leg een **afspraak** vast — die blijft bovenaan het gesprek staan als houvast.
5. Accepteer een bod → **betaal** via de gesimuleerde betaalpagina. Je betaling wordt vastgehouden
   tot bewijs van levering.
6. Bekijk op de zending-detail de **route-tijdlijn**, het **label**, en (bij READY) de
   **ontvangstcode** die je aan de ontvanger geeft.
7. Na levering: laat je **beoordeling** achter (sterren). Iets mis? Gebruik **claim/retour** of
   **melden** op een profiel.
8. **Wallet**: bij voldoende saldo kun je **uitbetaling aanvragen**.

### B. Reiziger — rit + bieden + afleveren met code
1. Log in als **traveler@** (tweede browser).
2. **Mijn ritten → Nieuwe rit**: publiceer een rit op corridor NL→SR met capaciteit. Zet 'm
   **zichtbaar** (en optioneel publiek/anoniem).
3. **Marktplaats**: open een toegestane zending en **plaats een bod** met bericht → opent de chat.
4. Doorloop de statusstappen tot **Afgeleverd**: bij het bevestigen van levering vul je de
   **ontvangstcode** in die de ontvanger je geeft (voor demo-zending PH-2026-000102 is dat `834217`).
   Klopt de code, dan wordt de betaling vrijgegeven (sim).
5. Laat na levering je **beoordeling** van de afzender achter.

### C. Hub / operatie — intake tot vertrek
1. Log in als **hub@**.
2. **Control Center**: zie de beoordelingswachtrij; keur zo nodig een zending goed/af.
3. Op een geboekte zending: doorloop **Intake → Inspecteren & verzegelen** (zegelnummer) →
   overdracht → vertrek. Elke stap komt in de **chain of custody**.
4. **Manifesten & legs**: maak een manifest (bv. vlucht KL-713), **koppel** zendingen en zet de
   status door (verzegel → vertrek → aankomst → sluit).
5. **Lockers & tijdslots**: wijs een pakket toe aan een vrij compartiment (krijgt PIN), boek een
   tijdslot, en doe een **voorraad-reconciliatie**.

### D. Beheer (admin) — sturing, content & feedback
1. Log in als **admin@**.
2. **Control Center** → onderaan **💬 Testfeedback**: hier komt alle ingestuurde feedback binnen,
   met gebruiker + pagina; je kunt items **afhandelen**. Ook de **🚩 Meldingen** staan hier.
3. **Gebruik & activiteit** (📈): zie hoeveel mensen actief zijn (24u/7d/30d), **wie er actief is
   geweest** (laatste login + logins/acties per lid), de activiteitstrechter (registratie → …→
   levering) en **Gedrag (events)**: paginaweergaven, "check gebruikt" en widget-kliks.
4. **Analytics**: bekijk de stuurinformatie / unit-economics (sim).
5. **Test Console**: stuur de simulaties aan (betaling laten slagen, KYC goedkeuren, enz.).
6. **Content & video's**: voeg een YouTube-video toe of (de)publiceer er een.
7. **Bulk-upload**: plak meerdere zendingen als CSV, controleer de voorvertoning en maak ze in één
   keer aan.

---

## 4. Wat is nog gesimuleerd / bekende beperkingen

Overal waar in het echt een externe partij nodig is, staat nu een **demo-adapter** — dus hierop
**geen bugs melden**, dat is bewust nog niet echt:
- **Facebook-login** — knop is een simulatie; gebruik de demo-accounts of registreer met e-mail.
- **Betalen / escrow / uitbetaling** — gesimuleerde betaalprovider (Test Console stuurt de uitkomst).
- **Identiteit (KYC)** — gesimuleerde verificatie; een ✓-badge is cosmetisch (blokkeert het testen niet).
- **Notificaties** (WhatsApp / e-mail / push) — belanden in de **notificatie-outbox**, er gaat niets
  echt de deur uit.
- **Routing / vervoer** — freight/fleet/legs zijn functioneel; echte vervoerders-API's volgen later.

Verder: dit is een **testomgeving met voorbeelddata**. Data kan tussentijds worden ververst
(reseed), dus reken niet op het bewaren van wat je aanmaakt.

---

## 5. Feedback terugkoppelen

- **Makkelijkst:** de **💬 Feedback-knop** rechtsonder in de app (op elke pagina). Kies het soort
  (bug / idee / vraag / anders) en typ je opmerking — die komt gebundeld binnen bij het team, mét de
  pagina waar je was.
- Handig om te vermelden: **rol + pagina + wat je deed + wat je verwachtte + wat er gebeurde**
  (een schermafbeelding helpt). Losse verbeterideeën ("dit zou fijner zijn als…") zijn ook welkom.
