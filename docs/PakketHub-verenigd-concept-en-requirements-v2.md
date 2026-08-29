# PakketHub — Verenigd concept & requirements (v2)

> **Leidend:** de founder-input (BugaWuga-oorsprong, feature-lijst, schermen, business case,
> disclaimer). De eerder gebouwde requirements sluiten hierop aan als **trust- & safety-laag**.
> Dit document is de bron van waarheid waarop de verdere bouw wordt uitgelijnd.

---

## 1. Het centrale concept (leidend)

**BugaWuga → PakketHub.** De oorspronkelijke naam was *BugaWuga*: een kleine **kangoeroe** die
iets kleins in haar **buidel** meeneemt voor een ander. Dat is precies het model — een **reiziger
die vrije bagageruimte gebruikt om iets voor iemand mee te nemen**. De merknaam is nu **PakketHub**
(embleem: zeshoek + cadeau, antraciet/oranje); de kangoeroe blijft het **oorsprongsverhaal en de
mascotte**.

**Wat we bouwen.** Een **peer-to-peer crowdshipping-marktplaats** die het voor mensen in opkomende
markten (Caribisch gebied, Latijns-Amerika) en de **diaspora** makkelijk maakt om goederen naar/uit
het buitenland te sturen en ontvangen. Reizigers benutten vrije bagageruimte en zijn onderdeel van de
deeleconomie. **Sneller, goedkoper, socialer en persoonlijker** dan traditionele koeriers.

- **Founders (business case):** Mark Lobman (visie) & Grady Griffen (techniek).
- **Marktomvang (remittance):** Caribisch $15 mld · Latijns-Amerika $60 mld · globaal $580 mld.
- **Positionering:** eerste crowdshipping-platform voor het Caribisch gebied; markt nog onontgonnen.

**Veiligheidsmotto (leidend, uit de disclaimer):** *"Bestel of koop het zelf!"* — neem **geen dichte
pakketten van vreemden** aan. De **reiziger koopt/bestelt het artikel zelf** met het in **escrow**
geparkeerde geld van de aanvrager en brengt het mee. Dit minimaliseert het smokkel-/mule-risico.

**Ontwerpprincipes founder:**
- **Mobiel-first responsive web** (telefoon & tablet). **Geen native app** (app-store-kosten/afhankelijkheid),
  **geen desktop-prioriteit**. *(Onze PWA is installeerbaar zonder app-store — sluit hierop aan.)*
- **Functioneel & betrouwbaar > mooi.**
- **Home:** een **vliegtuig waar mensen instappen** + twee duidelijke paden: **"Ik wil een pakket
  versturen"** vs **"Ik wil een pakket meenemen"**, met een **route-zoek** (Van / Naar / data).

---

## 2. Hoe onze bestaande bouw hierop aansluit

Onze gebouwde **compliance-backbone** is niet in tegenspraak met de sociale visie — het is de
**veilige realisatie** ervan:

| Onze bestaande bouwsteen | Rol in het verenigde concept |
|---|---|
| Eligibility-engine (positieve lijst, mystery-package-gate, open inspectie vereist) | Handhaaft het motto **"koop het zelf"**: dichte/onbekende pakketten → freight/geweigerd |
| Open inspectie + verzegeling + custody-events | Maakt peer-to-peer overdracht **traceerbaar en veilig** |
| Escrow-grootboek (dubbel boekhouden, HELD→RELEASED na levering) | De **garantie** uit feature 8a — geld geparkeerd tot bewijs van levering |
| Control Center + kill switches | Trust & safety / moderatie (sluit aan op admin "invite & ban") |
| i18n-fundament (5 talen) + PWA + staging | Basis voor de founder-eisen (talen, mobiel, testen) |

**Kernframing:** *wij leveren de trust- & safety-laag; de founder-visie voegt de sociale
marktplaats-voorkant toe.* De rest van dit document lijnt beide uit.

---

## 3. Feature-mapping — founder-eisen → onze modules

Legenda: ✅ gebouwd · 🔧 aanpassen/uitbreiden · 🆕 nieuw

| # | Founder-eis | Status | Module / actie |
|---|---|---|---|
| 1 | Cross-platform (iOS + Android) | ✅ | Responsive web + PWA werkt op beide |
| 2 | Responsive mobiel-web, **geen native app**, geen desktop-focus | 🔧 | Mobiel-first herijken; desktop mag, maar niet leidend |
| 3 | **Social login** (Facebook, LinkedIn, Instagram) | 🆕 | OAuth-adapter (start met Facebook); sim in staging |
| 4 | Admin kan **uitnodigen & verwijderen** (ban bij wangedrag) | 🔧 | Uitnodigingen + ban bovenop bestaand deactiveren/RLS |
| 5 | **Volgen** & zien wanneer een vriend reist | 🆕 | Sociale graaf (follows) + "vrienden reizen"-feed |
| 6 | Posten: **foto's + links + beschrijving** waarom je koerier/product wilt | 🆕/🔧 | Listings met foto-upload + link + reden (bovenop shipments/shop) |
| 7 | Alle features van het huidige `pakkethub.sharetribe.com` | 🔧 | Route-matching marktplaats (zie §4) dekt dit |
| 8 | **Betaalsysteem = belangrijkste** ($ en €, o.b.v. locatie) | 🔧 | Bestaande betaal-adapter uitbreiden (zie 8a-c) |
| 8a | **Escrow** om geld te parkeren (garantie) | ✅ | Escrow-grootboek aanwezig |
| 8b | Commissie **4–5%** van totaal (goederen + koeriersvergoeding) | 🔧 | `computeFee` naar 4–5% van (goederen + vergoeding) |
| 8c | **3 C's**: Cash (Western Union/overschrijving), Card (Visa/Maestro/Amex), Crypto (BTC/ETH) | 🆕 | Multi-method betaal-adapters (sim), per methode |
| 9 | **Punten/coins** interne valuta; centraal punt verdeelt (fiat+crypto); **uitbetaaldrempel** (bv. verdien $50, opname vanaf $500) | 🆕 | Points-wallet + drempel bovenop bestaand grootboek |
| 10 | Functioneel & betrouwbaar > mooi | 🔧 | Ontwerpkeuze; helderheid boven flair |
| 11 | Talen: **Eng / Portugees / Frans / Nederlands / Spaans / Chinees** | 🔧 | 5 talen ✅ → **Chinees als 6e toevoegen** |
| 12 | **Foto-uploads** (profiel + listings) | 🆕 | Media-upload + opslag (asset-store) |
| 13 | **Google Maps** voor locatie; alle landen/plaatsen (bv. Brazilië: Manaus/Curitiba/Belém) | 🆕/🔧 | Maps-integratie + **corridors verbreden** (nu NL–SR) |
| 14 | Goederen aangeven in **gewicht & maat** | ✅ | Aangifte + volumetrisch aanwezig |
| 15 | Admin **groepsmail** + leden **onderling berichten** (mail/chat) | 🔧 | Chat ✅; groepsmail (broadcast) + lid↔lid-DM toevoegen |
| 16 | Onderscheid **geregistreerd** (naam/tel/bankkaart/FB) vs **ongeregistreerd** (WU zonder ID) | 🆕 | Account-type/verificatieniveau + rechtenverschil |
| 17 | **Ratings 1–4 sterren** (1 slecht, 4 goed), wederzijds koerier↔afzender↔ontvanger | 🔧 | Rating-veld ✅ → wederzijdse 1–4-sterren-flow |
| 18 | **B2B-advertenties** (airlines/hotels/restaurants kopen ruimte) + virtuele cadeaus | 🆕 | Advertentiemodule + "virtuele cadeaus" (in-app purchase) |

**Business model (business case):** commissie per transactie ($10–$99) · in-app advertising & sponsored
(B2B) · virtuele cadeaus (in-app purchase) · partner-commissies (Digicel/WorldRemit/PayPal). → dekt
features 8b, 18, 9.

---

## 4. De belangrijkste nieuwe/aan te passen bouwstenen

### 4.1 Home = het concept in één scherm
- **Full-bleed hero: vliegtuig waar passagiers instappen** (tarmac-boarding, zoals de founder-schermen).
- Twee grote knoppen: **"Ik wil een pakket versturen"** / **"Ik wil een pakket meenemen"**.
- **Route-zoek** direct in de hero: **Van · Naar · vertrekdatum · (retour)datum → "Zoek routes / plaats route"**.
- Sociaal bewijs: *"Meer dan X reizigers en Y routes beschikbaar."*
- "Wat is PakketHub?"-uitleg + de kangoeroe-oorsprong (BugaWuga).

### 4.2 Route-matching marktplaats (de kern van Sharetribe-pariteit)
- **Reiziger** publiceert een **route**: van→naar, data, **prijs die hij wil**, **capaciteit** (max gewicht,
  pakketmaat), korte + lange omschrijving → **"Maak mijn route zichtbaar voor anderen"**.
- **Afzender** publiceert een **verzoek**: wat, van→naar, **prijs die hij wil betalen**, gewicht/maat,
  foto's + link + reden → **"Maak mijn verzoek zichtbaar voor anderen"**.
- Beide verschijnen als **listings met profielfoto + naam + plaats + 1–4 sterren**; filteren/sorteren
  op prijs/datum/gewicht. Reageren opent de bestaande **chat** en het **escrow/booking**-pad.
- *Sluit aan op:* onze bestaande `trips` (routes), `shipments`/`shopping_requests` (verzoeken),
  `offers`, `conversations`, `bookings`.

### 4.3 Profiel & vertrouwen
- Profiel met **foto**, plaats, **1–4 sterren** (wederzijds), aantal ritten, geverifieerd-badge.
- **Geregistreerd vs ongeregistreerd**: WU-zonder-ID = beperkte rechten (geen uitbetaling/hoge waarde).

### 4.4 Sociaal
- **Social login** (Facebook eerst). **Volgen** van gebruikers; **feed** "een vriend reist binnenkort".
- Lid↔lid-berichten (naast zending-chat). Admin **groepsmail/broadcast**.

### 4.5 Betalen (belangrijkste feature)
- **3 C's** als schakelbare adapters (sim in staging, echte providers bij livegang):
  **Cash/Western Union**, **Card (Visa/Maestro/Amex)**, **Crypto (BTC/ETH)**.
- **Escrow** (aanwezig) parkeert de garantie; **commissie 4–5%** over (goederen + koeriersvergoeding).
- **Punten/coins**: verdiensten komen centraal binnen als punten; **uitbetaaldrempel** vóór opname
  (fiat of crypto). Valuta $/€ afhankelijk van locatie.

### 4.6 Groei
- **Google Maps** + **bredere corridors** (Caribisch/Latijns-Amerika/globaal; Brazilië expliciet).
- **B2B-advertentiemodule** (airlines/hotels/restaurants) + **virtuele cadeaus**.
- **6e taal: Chinees.**

---

## 5. Merk & toon
- **Naam:** PakketHub. **Embleem:** zeshoek + cadeau (antraciet #2E2E2E / oranje #E9481C / beige).
- **Oorsprong/mascotte:** de BugaWuga-kangoeroe (buidel = bagageruimte) als verhaal en illustratie.
- **Toon:** functioneel, betrouwbaar, sociaal, persoonlijk. Beloftes pas claimen na meting
  (geen ongefundeerde 99%-claims).
- **Disclaimer** (founder aangeleverd) opnemen in het Trust Center, inclusief het motto
  *"Bestel of koop het zelf!"*.

---

## 6. Roadmap in golven

**Golf 1 — concept zichtbaar maken**
1. Home: **vliegtuig-boarding-hero + dubbele CTA + route-zoek**.
2. Marktplaats naar **route/verzoek-listings** met "maak zichtbaar" + profielfoto + **1–4 sterren**.
3. **Chinees** toevoegen (6e taal).
4. Disclaimer + kangoeroe-oorsprongsverhaal op de site.

**Golf 2 — sociaal & betalen**
5. **Social login** (Facebook) — sim-adapter.
6. **Foto-uploads** (profiel + listings).
7. **Volgen/vrienden** + "vrienden reizen"-feed; lid↔lid-berichten; admin groepsmail.
8. **Punten/coins** + uitbetaaldrempel; **commissie 4–5%**.
9. **3 C's-betaaladapters** (Cash/WU, Card, Crypto) — sim.

**Golf 3 — groei**
10. **Google Maps** + corridors verbreden (Brazilië/Caribisch/globaal).
11. **B2B-advertentiemodule** + virtuele cadeaus.
12. **Geregistreerd/ongeregistreerd** onderscheid + admin uitnodigen/ban.

**Doorlopend:** de compliance-backbone (eligibility "koop het zelf" + open inspectie + custody +
escrow) blijft de veiligheidslaag onder alles.

---

## 7. Behouden vs herzien

- **Behouden (blijft de fundering):** eligibility-engine, open inspectie & custody, escrow-grootboek,
  i18n-fundament, PWA, staging/Coolify, control center.
- **Herzien (naar het founder-concept):** home & marktplaats-UX → route-matching + sociaal;
  betaalmodel → 3 C's + punten + 4–5% commissie; geografie → verbreden; profielen → foto's + 1–4 sterren;
  auth → social login; talen → +Chinees.

---

## 8. Openstaande beslissingen (voor de founder)
1. **Merknaam definitief PakketHub** (met BugaWuga als verhaal/mascotte) — akkoord?
2. **Kleur:** PakketHub antraciet/oranje aanhouden, of de oude BugaWuga-groen/bruin terug?
3. **Startgeografie:** NL–SR pilot uitbreiden met welke corridor eerst (Brazilië?, Caribisch?).
4. **Crypto & Western Union:** welke provider(s) als eerste echte koppeling na de sim?
5. **Punten/coins:** exacte uitbetaaldrempel en of punten ook tussen leden overdraagbaar zijn.
