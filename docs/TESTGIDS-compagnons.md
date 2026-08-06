# PakketHub — testgids voor compagnons

Deze gids helpt je de PakketHub-demo te testen. Alles draait op een **testomgeving**
(staging) met **simulaties** in plaats van echte betaal-/verificatie-/bezorgkoppelingen —
er wordt dus **geen echt geld** verplaatst en er worden geen echte berichten verstuurd.

---

## 1. Inloggen op de testomgeving

- **URL:** https://pakkethub.koniq.app
- Eerst zie je een **wachtwoordpoort** (site-brede staging-beveiliging). Vul het gedeelde
  staging-wachtwoord in dat je van Ruben/Winston hebt gekregen. *(Dit is de poort, niet je account.)*
- Daarna kom je op de publieke website. Rechtsboven kun je:
  - **Taal** kiezen: 🇧🇷 Português · 🇪🇸 Español · 🇬🇧 English · 🇫🇷 Français · 🇳🇱 Nederlands
  - **Thema** kiezen: licht / donker / automatisch
  - **App installeren** (PWA) — op mobiel verschijnt de installknop direct in de bovenbalk.

### Demo-accounts (wachtwoord voor allemaal: `demo12345`)

| Rol | E-mail | Wat je test |
|-----|--------|-------------|
| Afzender | `sender@pakkethub.com` | Pakket aanmelden, aanbod ontvangen, chatten, betalen (sim), boeken/producten |
| Reiziger | `traveler@pakkethub.com` | Rit publiceren, bieden op zendingen, chatten |
| Hub / operatie | `hub@pakkethub.com` | Intake, inspectie & zegel, manifesten, lockers, dispatch |
| Beheer (admin) | `admin@pakkethub.com` | Alles + Control Center, analytics, video-CMS, test-console |

> Tip: log in twee browsers (of één normaal + één incognito) in als **afzender** én **reiziger**
> tegelijk, zodat je de chat en het bieden tussen twee partijen live ziet.

---

## 2. Demo-scenario's per rol

### A. Afzender — pakket aanmelden tot betaling
1. Log in als **sender@**.
2. **Verzenden** (publiek) of **+ Pakket versturen** (in de app): geef corridor NL→SR, ontvanger,
   gewicht en de **inhoud per item** op. Je ziet meteen de **eligibility-check** (toegestaan /
   beoordelen / freight / geweigerd) — dit is de deterministische regelmotor.
3. Open de zending. Bij **Toegestaan** verschijnt hij op de marktplaats voor reizigers.
4. Zodra een reiziger biedt (zie rol B), opent automatisch een **chat**. Overleg en leg een
   **afspraak** vast (plaats/tijd/prijs).
5. Accepteer een bod → **betaal** via de gesimuleerde betaalpagina (kies "geslaagd" of "mislukt").
   Je betaling wordt "in escrow" gehouden.
6. Bekijk op de zending-detail de **route-tijdlijn** (multimodaal: ophalen → hub → hoofdtransport
   → douane → bezorging) en het **label** (openen/printen).
7. **Boeken** (`Adres- & productboek`): sla een ontvanger en een product op en zie hoe dat een
   volgende aanmelding versnelt.

### B. Reiziger — rit + bieden
1. Log in als **traveler@** (tweede browser).
2. **Mijn ritten → Nieuwe rit**: publiceer een rit op corridor NL→SR met capaciteit.
3. **Ritten & aanbod**: open een toegestane zending en **plaats een bod** met bericht → dit
   opent de chat met de afzender.
4. Bevestig de afspraak in de chat. Na levering (zie rol C) wordt je betaling vrijgegeven (sim).

### C. Hub / operatie — intake tot vertrek
1. Log in als **hub@**.
2. **Control Center**: zie de beoordelingswachtrij; keur zo nodig een zending goed/af.
3. Op een geboekte zending: doorloop **Intake → Inspecteren & verzegelen** (zegelnummer) →
   overdracht → vertrek. Elke stap komt in de **chain of custody**.
4. **Manifesten & legs**: maak een manifest (bv. vlucht KL-713), **koppel** een of meer zendingen,
   en zet de status door (verzegel → vertrek → aankomst → sluit). Alle gekoppelde zendingen en hun
   custody-log lopen mee.
5. **Lockers & tijdslots**: wijs een pakket toe aan een vrij compartiment (krijgt PIN), boek een
   tijdslot, en doe een **voorraad-reconciliatie** (scan/plak referenties → MATCH/UNEXPECTED/MISSING).

### D. Beheer (admin) — sturing & content
1. Log in als **admin@**.
2. **Analytics**: bekijk de stuurinformatie / unit-economics (sim).
3. **Test Console**: stuur de simulaties aan (betaling laten slagen, KYC goedkeuren, enz.).
4. **Content & video's**: voeg een YouTube-video toe of (de)publiceer er een — gepubliceerde
   video's verschijnen op de homepage.
5. **Bulk-upload** (ook voor afzender/zakelijk): plak meerdere zendingen als CSV, controleer de
   voorvertoning en maak ze in één keer aan.

---

## 3. Waar zitten de simulatiegrenzen?

Overal waar in het echt een externe partij nodig is, staat nu een **demo-adapter** met een
duidelijke melding:
- **Betalen/escrow/uitbetaling** — gesimuleerde betaalprovider (Test Console stuurt de uitkomst).
- **Identiteit (KYC)** — gesimuleerde IDV; een beoordelaar keurt goed/af via de Test Console.
- **Notificaties** (WhatsApp/e-mail/push) — verzonden berichten staan in de **notificatie-outbox**,
  er gaat niets echt de deur uit.
- **Routing/vervoer** — freight/fleet/legs zijn functioneel; echte vervoerders-API's volgen later.

---

## 4. Wat rapporteer je terug?

Per bevinding graag: **rol + pagina + wat je deed + wat je verwachtte + wat er gebeurde**
(schermafbeelding helpt). Losse verbeterideeën ("dit zou fijner zijn als…") zijn ook welkom.

> Let op: dit is een testomgeving met voorbeelddata. Data kan tussentijds worden ververst
> (reseed), dus reken niet op het bewaren van wat je aanmaakt.
