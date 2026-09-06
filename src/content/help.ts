// In-app gebruikershandleiding, rolgefilterd, met schermafbeeldingen.
// Los van de strikte Messages-types gehouden zodat de (lange) tekst niet in
// 6 talen compleet hoeft: NL is primair, EN is er, overige talen → EN.
// `img` verwijst naar /help/<img>.png (public/help/, echte demo-schermen).
import type { Locale } from "@/i18n/config";

export type HelpSection = { h: string; steps: string[]; img?: string };
export type HelpGuide = { key: string; cap?: string; icon: string; title: string; intro: string; sections: HelpSection[] };
export type HelpChrome = { title: string; sub: string; for_role: string; common: string; print: string; download: string; tip: string };

const NL: { chrome: HelpChrome; guides: HelpGuide[] } = {
  chrome: {
    title: "Handleiding",
    sub: "Zo werkt BugaWuga — met echte schermen, afgestemd op jouw rol.",
    for_role: "Voor jouw rol",
    common: "Aan de slag — voor iedereen",
    print: "Print",
    download: "Download PDF",
    tip: "Kom je er niet uit? Gebruik de 💬 Feedback-knop rechtsonder — je bericht komt met pagina en al bij het team.",
  },
  guides: [
    {
      key: "common", icon: "🚀", title: "Aan de slag", intro: "De basis die voor elk profiel geldt. Begin hier.",
      sections: [
        { h: "Inloggen & je startpagina", img: "overview", steps: [
          "Inloggen — ga naar de website, klik op Inloggen en gebruik je e-mail + wachtwoord. Heb je nog geen account? Klik op “Account maken” en kies je rol (afzender of reiziger).",
          "Overzicht — na het inloggen kom je op je Overzicht: je belangrijkste cijfers en je laatste zendingen/ritten in één blik.",
          "Menu links — alle onderdelen staan in het menu aan de linkerkant (op de telefoon onderin). Een getal naast een item (bv. Berichten of Marktplaats) laat zien wat nieuw of open is.",
          "Je rol — linksonder zie je je naam, je rol en of je account geverifieerd is (✓).",
        ]},
        { h: "Taal, thema & de app installeren", steps: [
          "Taal — rechtsboven kies je Nederlands, Engels, Spaans, Portugees, Frans of Chinees. De hele app schakelt direct mee.",
          "Thema — met één knop wissel je tussen licht, donker en automatisch (volgt je toestel).",
          "Installeren — klik op “Installeer de app”. Op de telefoon zet je BugaWuga zo op je beginscherm; hij opent daarna schermvullend, net als een gedownloade app.",
        ]},
        { h: "Chatten & afspraken maken", img: "messages", steps: [
          "Chat — overal waar je met een andere partij te maken hebt kun je chatten (vanuit de marktplaats, een profiel of een zending).",
          "Standaardvragen — onderin de chat staan snelkeuze-knoppen met veelgestelde vragen, zodat je snel het juiste vraagt.",
          "Afspraak vastpinnen — leg je afspraak (wat, wanneer, prijs) vast; die blijft bovenaan het gesprek staan als houvast voor beide partijen.",
        ]},
        { h: "Meldingen, profiel & feedback", steps: [
          "Meldingen — het belletje toont ongelezen updates (nieuw bod, bericht, statuswijziging).",
          "Mijn account — beheer je naam, telefoon en wachtwoord. Verificatie (KYC) staat hier ook; een ✓ betekent dat je kunt betalen, boeken en uitbetaald worden.",
          "Feedback — met de 💬-knop rechtsonder stuur je op elke pagina een opmerking; die komt gebundeld bij het team binnen, inclusief de pagina waar je was.",
        ]},
      ],
    },
    {
      key: "sender", cap: "shipment.create", icon: "📦", title: "Afzender — iets versturen",
      intro: "Van pakket aanmelden tot betaling, volgen en levering met code.",
      sections: [
        { h: "1. Pakket aanmelden & de gratis check", img: "check", steps: [
          "Start — klik op “Pakket versturen” (of open Verzenden). Kies de corridor (nu Nederland → Suriname) en vul de ontvanger in.",
          "Inhoud per item — geef elk item op met een korte omschrijving, de waarde en de categorie. Voeg met “+ Item” meer regels toe.",
          "Gratis check — je ziet meteen of het pakket via een reiziger mág (Toegestaan / Beoordelen / Geweigerd) én een prijsindicatie. Dit is een automatische regelcheck, geen mens.",
          "Aangeven, niet dichtplakken — geef eerlijk op wat erin zit en laat het pakket open/inspecteerbaar. Dat is de kern van veilig versturen.",
        ]},
        { h: "2. Zichtbaar maken op de marktplaats", img: "marketplace", steps: [
          "Zichtbaar zetten — open je zending en zet ‘m zichtbaar op de marktplaats, zodat reizigers je verzoek zien.",
          "Prijs & info — geef aan wat je wilt betalen en een korte toelichting.",
          "Publiek (optioneel) — je kunt je verzoek óók anoniem op de publieke website tonen (alleen voornaam + initiaal, bestemming, gewicht en prijs — nooit de inhoud, je adres of contactgegevens).",
        ]},
        { h: "3. Bod ontvangen, chatten & betalen", steps: [
          "Bod — reageert een reiziger, dan opent automatisch een chat met het bod erin.",
          "Overleggen — stem via de chat de details en de prijs af en leg de afspraak vast.",
          "Betalen — accepteer het bod en reken af. Je betaling wordt veilig vastgehouden en pas vrijgegeven na bewijs van levering.",
        ]},
        { h: "4. Volgen & afleveren met ontvangstcode", img: "shipment", steps: [
          "Statustijdlijn — op de zending volg je elke stap (aangemaakt → verzegeld → onderweg → klaar voor afhalen → afgeleverd).",
          "Label — open of print het verzendlabel.",
          "Ontvangstcode — zodra de zending klaar is voor aflevering verschijnt een 6-cijferige ontvangstcode. Geef die aan de ontvanger; de levering wordt pas bevestigd (en de betaling vrijgegeven) als de code klopt.",
        ]},
        { h: "5. Na de levering & bij problemen", steps: [
          "Beoordelen — laat sterren achter voor de reiziger; dat bouwt vertrouwen op in de community.",
          "Claim of retour — is er iets mis met de levering, open dan een claim of vraag een retour aan.",
          "Melden — gedraagt iemand zich verkeerd? Meld de gebruiker; het komt binnen bij het beheer.",
        ]},
        { h: "6. Handige extra's", steps: [
          "Adres- & productboek — bewaar ontvangers en producten, zodat een volgende zending sneller klaar staat.",
          "Bulk-upload — meerdere zendingen tegelijk? Plak ze als CSV, controleer de voorvertoning en maak ze in één keer aan.",
        ]},
      ],
    },
    {
      key: "traveler", cap: "trip.create", icon: "🧳", title: "Reiziger — ruimte aanbieden",
      intro: "Verdien bij door op je reis pakketten mee te nemen.",
      sections: [
        { h: "1. Je rit publiceren", img: "trips", steps: [
          "Nieuwe rit — ga naar “Mijn ritten” en maak een rit aan: kies de corridor, je vertrekdatum en hoeveel ruimte (kg) je hebt.",
          "Prijsindicatie — geef aan wat je ongeveer wilt ontvangen; dit helpt afzenders een passend bod te doen.",
          "Zichtbaar maken — zet je rit zichtbaar op de marktplaats, en eventueel anoniem op de publieke website.",
        ]},
        { h: "2. Verzoeken zoeken & bieden", img: "marketplace", steps: [
          "Marktplaats — bekijk de openstaande verzoeken; filter op bestemming, prijs of beoordeling en sorteer zoals je wilt.",
          "Bieden — open een toegestaan verzoek en plaats een bod met een kort bericht. Zo open je meteen de chat met de afzender.",
        ]},
        { h: "3. Afspreken via chat", steps: [
          "Overleggen — stem via de chat af wat je meeneemt, waar/wanneer je ophaalt en de prijs.",
          "Afspraak — leg de afspraak vast; die blijft bovenaan staan als houvast.",
        ]},
        { h: "4. Meenemen & afleveren met code", steps: [
          "Statusstappen — doorloop de stappen tot “Afgeleverd”.",
          "Ontvangstcode — vraag bij de aflevering de 6-cijferige code aan de ontvanger en vul die in. Klopt de code, dan is de levering bevestigd en komt je betaling vrij.",
        ]},
        { h: "5. Verdiensten & uitbetaling", img: "wallet", steps: [
          "Wallet — in je wallet zie je je saldo en je gespaarde punten.",
          "Uitbetaling — zodra je saldo de uitbetaaldrempel haalt, vraag je met één klik een uitbetaling aan; de status “in behandeling” verschijnt.",
          "Beoordelen — laat na afloop een beoordeling achter voor de afzender.",
        ]},
      ],
    },
    {
      key: "ops", cap: "ops.intake", icon: "🏭", title: "Hub / operatie — verwerking",
      intro: "Intake, inspectie, verzegeling, custody en transport.",
      sections: [
        { h: "Intake & verzegelen", img: "ops_intake", steps: [
          "Werklijst — op “Hub & intake” zie je de geboekte zendingen die intake/inspectie nodig hebben, plus de hubs & service points in de corridor.",
          "Inspectie — loop bij een zending de checklist na (inhoud, aantal, staat, batterijen, vloeistoffen, aangifte).",
          "Verzegelen — geef een zegelnummer op en verzegel; de zending gaat naar de volgende status.",
          "Chain of custody — elke stap en overdracht wordt vastgelegd in een onwijzigbaar logboek.",
        ]},
        { h: "Manifesten & legs", img: "ops_manifests", steps: [
          "Manifest maken — maak een manifest (bv. een vlucht) en koppel er zendingen aan.",
          "Status doorzetten — verzegelen → vertrek → aankomst → sluiten. Alle gekoppelde zendingen en hun custody lopen mee.",
        ]},
        { h: "Lockers & tijdslots", img: "ops_lockers", steps: [
          "Compartiment toewijzen — wijs een pakket toe aan een vrij compartiment (met pincode) en boek een tijdslot.",
          "Voorraad-reconciliatie — scan/plak referenties en vergelijk: MATCH / ONVERWACHT / ONTBREEKT.",
        ]},
        { h: "Beoordelingswachtrij", img: "control", steps: [
          "Control Center — behandel de wachtrij met zendingen die beoordeling nodig hebben en keur ze goed of af.",
        ]},
      ],
    },
    {
      key: "admin", cap: "control.view", icon: "🛡️", title: "Beheer — sturing & toezicht",
      intro: "Overzicht, veiligheid, inzicht in gebruik, en content.",
      sections: [
        { h: "Control Center: toezicht & veiligheid", img: "control", steps: [
          "Beoordelen — werk de beoordelingswachtrij af; overrule met een reden waar nodig.",
          "Kill switch — zet per corridor een noodstop als dat moet.",
          "Meldingen — handel 🚩 gerapporteerde gebruikers/listings af.",
        ]},
        { h: "Gebruik & activiteit (dashboard)", img: "insights", steps: [
          "Actieve gebruikers — zie hoeveel mensen actief zijn (24u/7d/30d) en wie er actief is geweest, met laatste login en aantal acties per lid.",
          "Trechter & gedrag — volg de activiteitstrechter (registratie → … → levering) en het gedrag (paginaweergaven, “check gebruikt”, kliks).",
        ]},
        { h: "Feedback, simulaties & content", steps: [
          "Testfeedback — alle ingestuurde feedback komt gebundeld binnen in het Control Center, met gebruiker + pagina.",
          "Test Console — stuur de simulaties aan (betaling laten slagen, verificatie goedkeuren) tijdens het testen.",
          "Content & leden — beheer video's/advertenties en nodig leden uit of verban ze.",
        ]},
      ],
    },
  ],
};

const EN: { chrome: HelpChrome; guides: HelpGuide[] } = {
  chrome: {
    title: "User guide",
    sub: "How BugaWuga works — with real screens, tailored to your role.",
    for_role: "For your role",
    common: "Getting started — for everyone",
    print: "Print",
    download: "Download PDF",
    tip: "Stuck? Use the 💬 Feedback button (bottom-right) — your message reaches the team together with the page you were on.",
  },
  guides: [
    {
      key: "common", icon: "🚀", title: "Getting started", intro: "The basics that apply to every profile. Start here.",
      sections: [
        { h: "Log in & your home page", img: "overview", steps: [
          "Log in — go to the website, click Log in and use your email + password. No account yet? Click “Create account” and choose your role (sender or traveler).",
          "Overview — after logging in you land on your Overview: your key figures and latest shipments/trips at a glance.",
          "Left menu — every part of the app is in the left menu (bottom bar on phone). A number next to an item (e.g. Messages or Marketplace) shows what's new or open.",
          "Your role — bottom-left shows your name, role and whether your account is verified (✓).",
        ]},
        { h: "Language, theme & installing the app", steps: [
          "Language — top-right, pick Dutch, English, Spanish, Portuguese, French or Chinese. The whole app switches instantly.",
          "Theme — one button toggles light, dark and automatic (follows your device).",
          "Install — click “Install the app”. On a phone this adds BugaWuga to your home screen; it then opens full-screen like a downloaded app.",
        ]},
        { h: "Chat & making agreements", img: "messages", steps: [
          "Chat — wherever you deal with another party you can chat (from the marketplace, a profile or a shipment).",
          "Quick questions — shortcut buttons with common questions sit at the bottom of the chat.",
          "Pin the agreement — record what/when/price; it stays pinned at the top for both parties.",
        ]},
        { h: "Notifications, profile & feedback", steps: [
          "Notifications — the bell shows unread updates (new offer, message, status change).",
          "My account — manage your name, phone and password. Verification (KYC) is here too; a ✓ means you can pay, book and get paid out.",
          "Feedback — the 💬 button (bottom-right) sends a remark from any page, bundled to the team with the page you were on.",
        ]},
      ],
    },
    {
      key: "sender", cap: "shipment.create", icon: "📦", title: "Sender — send something",
      intro: "From creating a shipment to payment, tracking and delivery with a code.",
      sections: [
        { h: "1. Create a shipment & the free check", img: "check", steps: [
          "Start — click “Send a package” (or open Send). Choose the corridor (currently Netherlands → Suriname) and enter the recipient.",
          "Contents per item — add each item with a short description, value and category. Use “+ Item” for more rows.",
          "Free check — you instantly see whether it may travel via a traveler (Allowed / Review / Rejected) and an indicative price. This is an automatic rule check, not a person.",
          "Declare, don't seal shut — honestly state what's inside and keep the package open/inspectable. That's the core of safe sending.",
        ]},
        { h: "2. Make it visible on the marketplace", img: "marketplace", steps: [
          "Make visible — open your shipment and make it visible on the marketplace so travelers see your request.",
          "Price & info — state what you'd like to pay and a short note.",
          "Public (optional) — also show your request anonymously on the public site (first name + initial, destination, weight and price — never the contents, your address or contact details).",
        ]},
        { h: "3. Offer, chat & payment", steps: [
          "Offer — when a traveler responds, a chat opens automatically with the offer.",
          "Discuss — agree the details and price via chat and pin the agreement.",
          "Pay — accept the offer and pay. Your payment is held safely and only released after proof of delivery.",
        ]},
        { h: "4. Track & deliver with a receipt code", img: "shipment", steps: [
          "Timeline — follow every step on the shipment (created → sealed → in transit → ready for pickup → delivered).",
          "Label — open or print the shipping label.",
          "Receipt code — once the shipment is ready for delivery a 6-digit receipt code appears. Give it to the recipient; delivery is only confirmed (and payment released) once the code matches.",
        ]},
        { h: "5. After delivery & problems", steps: [
          "Rate — leave stars for the traveler; it builds trust in the community.",
          "Claim or return — if something's wrong with the delivery, open a claim or request a return.",
          "Report — someone misbehaving? Report the user; it reaches management.",
        ]},
        { h: "6. Handy extras", steps: [
          "Address & product book — save recipients and products so your next shipment is ready faster.",
          "Bulk upload — multiple shipments? Paste them as CSV, check the preview and create them all at once.",
        ]},
      ],
    },
    {
      key: "traveler", cap: "trip.create", icon: "🧳", title: "Traveler — offer space",
      intro: "Earn on the side by carrying packages on your trip.",
      sections: [
        { h: "1. Publish your trip", img: "trips", steps: [
          "New trip — go to “My trips” and create a trip: choose the corridor, your departure date and how much space (kg) you have.",
          "Indicative price — state roughly what you'd like to receive; this helps senders make a fitting offer.",
          "Make visible — set your trip visible on the marketplace, optionally anonymously on the public site.",
        ]},
        { h: "2. Find requests & bid", img: "marketplace", steps: [
          "Marketplace — browse open requests; filter by destination, price or rating and sort as you like.",
          "Bid — open an allowed request and place an offer with a short message. This opens the chat with the sender.",
        ]},
        { h: "3. Agree via chat", steps: [
          "Discuss — agree what you'll carry, where/when you pick up and the price.",
          "Agreement — pin the agreement so it stays at the top.",
        ]},
        { h: "4. Carry & deliver with a code", steps: [
          "Status steps — go through the steps up to “Delivered”.",
          "Receipt code — at delivery, ask the recipient for the 6-digit code and enter it. If it matches, delivery is confirmed and your payout is released.",
        ]},
        { h: "5. Earnings & payout", img: "wallet", steps: [
          "Wallet — your wallet shows your balance and points.",
          "Payout — once your balance reaches the threshold, request a payout in one click; the status “pending” appears.",
          "Rate — leave a rating for the sender afterwards.",
        ]},
      ],
    },
    {
      key: "ops", cap: "ops.intake", icon: "🏭", title: "Hub / operations — processing",
      intro: "Intake, inspection, sealing, custody and transport.",
      sections: [
        { h: "Intake & sealing", img: "ops_intake", steps: [
          "Work list — “Hub & intake” shows the booked shipments needing intake/inspection, plus the hubs & service points in the corridor.",
          "Inspection — on a shipment, run the checklist (contents, quantity, condition, batteries, liquids, declaration).",
          "Sealing — enter a seal number and seal; the shipment moves to the next status.",
          "Chain of custody — every step and handover is recorded in an immutable log.",
        ]},
        { h: "Manifests & legs", img: "ops_manifests", steps: [
          "Create a manifest — make a manifest (e.g. a flight) and link shipments to it.",
          "Advance the status — seal → depart → arrive → close. All linked shipments and their custody follow.",
        ]},
        { h: "Lockers & timeslots", img: "ops_lockers", steps: [
          "Assign a compartment — assign a package to a free compartment (with a pin) and book a timeslot.",
          "Stock reconciliation — scan/paste references and compare: MATCH / UNEXPECTED / MISSING.",
        ]},
        { h: "Review queue", img: "control", steps: [
          "Control Center — handle the queue of shipments needing review and approve or reject them.",
        ]},
      ],
    },
    {
      key: "admin", cap: "control.view", icon: "🛡️", title: "Management — steering & oversight",
      intro: "Overview, safety, usage insight and content.",
      sections: [
        { h: "Control Center: oversight & safety", img: "control", steps: [
          "Review — work through the review queue; override with a reason where needed.",
          "Kill switch — set a per-corridor emergency stop when necessary.",
          "Reports — resolve 🚩 reported users/listings.",
        ]},
        { h: "Usage & activity (dashboard)", img: "insights", steps: [
          "Active users — see how many are active (24h/7d/30d) and who has been active, with last login and actions per member.",
          "Funnel & behaviour — follow the activity funnel (sign-up → … → delivery) and behaviour (page views, “check used”, clicks).",
        ]},
        { h: "Feedback, simulations & content", steps: [
          "Test feedback — all submitted feedback arrives bundled in the Control Center, with user + page.",
          "Test Console — drive the simulations (make a payment succeed, approve verification) while testing.",
          "Content & members — manage videos/ads and invite or ban members.",
        ]},
      ],
    },
  ],
};

export function getHelp(locale: Locale) {
  return locale === "nl" ? NL : EN;
}
