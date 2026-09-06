// In-app gebruikershandleiding, rolgefilterd. Los van de strikte Messages-types
// gehouden zodat de (lange) tekst niet in 6 talen compleet hoeft te zijn:
// NL is primair, EN is er, overige talen vallen terug op EN.
import type { Locale } from "@/i18n/config";

export type HelpSection = { h: string; steps: string[] };
export type HelpGuide = { key: string; cap?: string; icon: string; title: string; intro: string; sections: HelpSection[] };
export type HelpChrome = { title: string; sub: string; for_role: string; common: string; print: string; download: string; tip: string };

const NL: { chrome: HelpChrome; guides: HelpGuide[] } = {
  chrome: {
    title: "Handleiding",
    sub: "Zo werkt BugaWuga — afgestemd op jouw rol.",
    for_role: "Voor jouw rol",
    common: "Aan de slag — voor iedereen",
    print: "Print",
    download: "Download PDF",
    tip: "Tip: gebruik de 💬 Feedback-knop rechtsonder als iets onduidelijk is of beter kan.",
  },
  guides: [
    {
      key: "common", icon: "🚀", title: "Aan de slag", intro: "De basis die voor elk profiel geldt.",
      sections: [
        { h: "Inloggen, taal & weergave", steps: [
          "Inloggen — met je e-mail en wachtwoord, of via de knop bovenaan.",
          "Taal — kies rechtsboven (of onderin) uit Nederlands, Engels, Spaans, Portugees, Frans of Chinees.",
          "Thema — één knop wisselt tussen licht, donker en automatisch.",
          "App installeren — via de installeer-knop draai je BugaWuga als app op je telefoon of desktop.",
        ]},
        { h: "Navigeren", steps: [
          "Menu — op desktop links, op mobiel via de onderbalk. Getallen naast een item (bv. Berichten of Marktplaats) tonen wat er nieuw of open is.",
          "Overzicht — je startpagina met je belangrijkste zaken in één blik.",
        ]},
        { h: "Chatten & afspraken", steps: [
          "Chat — overal bereikbaar waar je met een andere partij te maken hebt (marktplaats, profiel, zending).",
          "Standaardvragen — snelkeuze-knoppen helpen je snel het juiste te vragen.",
          "Afspraak — een gemaakte afspraak blijft bovenaan het gesprek staan als houvast voor beide partijen.",
        ]},
        { h: "Meldingen, profiel & feedback", steps: [
          "Meldingen — het belletje toont ongelezen updates.",
          "Profiel & verificatie — beheer je gegevens op Mijn account; een ✓ betekent geverifieerd.",
          "Feedback — met de 💬-knop stuur je opmerkingen rechtstreeks naar het team.",
        ]},
      ],
    },
    {
      key: "sender", cap: "shipment.create", icon: "📦", title: "Afzender — iets versturen",
      intro: "Van pakket aanmelden tot betaling en levering.",
      sections: [
        { h: "1. Pakket aanmelden & check", steps: [
          "Verzenden — geef corridor, ontvanger, gewicht en de inhoud per item op.",
          "Gratis check — je ziet meteen of het via een reiziger mag (toegestaan/beoordelen/geweigerd) en een prijsindicatie.",
        ]},
        { h: "2. Zichtbaar maken", steps: [
          "Op de marktplaats — zet je verzoek zichtbaar zodat reizigers het zien.",
          "Publiek (optioneel) — je kunt het óók anoniem op de publieke website tonen (alleen voornaam + initiaal).",
        ]},
        { h: "3. Bod, afspraak & betaling", steps: [
          "Bod ontvangen — reageert een reiziger, dan opent automatisch een chat.",
          "Accepteren & betalen — na akkoord betaal je; het bedrag wordt vastgehouden tot bewijs van levering.",
        ]},
        { h: "4. Volgen & leveren", steps: [
          "Statustijdlijn & label — volg elke stap en open/print het label.",
          "Ontvangstcode — geef de 6-cijferige code aan de ontvanger; de levering wordt pas bevestigd als de code klopt.",
        ]},
        { h: "5. Na de levering", steps: [
          "Beoordelen — laat sterren achter voor de reiziger.",
          "Probleem? — open een claim/retour, of meld een gebruiker.",
          "Handig — bewaar ontvangers/producten in het adres- & productboek, of gebruik bulk-upload voor meerdere zendingen.",
        ]},
      ],
    },
    {
      key: "traveler", cap: "trip.create", icon: "🧳", title: "Reiziger — ruimte aanbieden",
      intro: "Verdien bij door pakketten mee te nemen op je reis.",
      sections: [
        { h: "1. Rit publiceren", steps: [
          "Mijn ritten → Nieuwe rit — geef corridor, datum en capaciteit op.",
          "Zichtbaar maken — zet je rit zichtbaar (en eventueel anoniem op de publieke website).",
        ]},
        { h: "2. Bieden & afspreken", steps: [
          "Marktplaats — bekijk openstaande verzoeken en plaats een bod met een bericht.",
          "Chat — stem de details en prijs af; leg de afspraak vast.",
        ]},
        { h: "3. Meenemen & afleveren", steps: [
          "Statusstappen — doorloop de stappen tot Afgeleverd.",
          "Ontvangstcode — vul bij levering de code in die de ontvanger je geeft; klopt hij, dan komt je betaling vrij.",
        ]},
        { h: "4. Verdiensten", steps: [
          "Wallet — zie je saldo en punten.",
          "Uitbetaling — vraag een uitbetaling aan zodra je saldo de drempel haalt.",
          "Beoordelen — laat een beoordeling achter voor de afzender.",
        ]},
      ],
    },
    {
      key: "ops", cap: "ops.intake", icon: "🏭", title: "Hub / operatie — verwerking",
      intro: "Intake, inspectie, custody en transport.",
      sections: [
        { h: "Intake & verzegelen", steps: [
          "Inspecteren — loop de checklist na en verzegel met een zegelnummer.",
          "Chain of custody — elke overdracht wordt vastgelegd en is niet te wijzigen.",
        ]},
        { h: "Transport", steps: [
          "Manifesten & legs — maak een manifest (bv. een vlucht), koppel zendingen en zet de status door (verzegel → vertrek → aankomst → sluit).",
          "Lockers & tijdslots — wijs een pakket toe aan een compartiment (met pin), boek een tijdslot en doe een voorraad-reconciliatie.",
        ]},
        { h: "Beoordeling", steps: [
          "Control Center — behandel de beoordelingswachtrij en keur zendingen goed of af.",
        ]},
      ],
    },
    {
      key: "admin", cap: "control.view", icon: "🛡️", title: "Beheer — sturing & toezicht",
      intro: "Overzicht, veiligheid, inzicht en content.",
      sections: [
        { h: "Toezicht & veiligheid", steps: [
          "Control Center — beoordeel zendingen, zet een kill switch per corridor, en handel 🚩 meldingen af.",
          "Testfeedback — alle ingestuurde feedback komt hier gebundeld binnen, met gebruiker + pagina.",
        ]},
        { h: "Inzicht", steps: [
          "Gebruik & activiteit — zie actieve gebruikers (24u/7d/30d), wie er actief is geweest, de activiteitstrechter en gedrag (paginaweergaven, check gebruikt, kliks).",
          "Analytics — stuurinformatie en unit-economics.",
        ]},
        { h: "Beheer & content", steps: [
          "Test Console — stuur de simulaties aan (betaling, verificatie).",
          "Content & video's, advertenties, leden — beheer wat er op de site verschijnt en wie toegang heeft.",
        ]},
      ],
    },
  ],
};

const EN: { chrome: HelpChrome; guides: HelpGuide[] } = {
  chrome: {
    title: "User guide",
    sub: "How BugaWuga works — tailored to your role.",
    for_role: "For your role",
    common: "Getting started — for everyone",
    print: "Print",
    download: "Download PDF",
    tip: "Tip: use the 💬 Feedback button (bottom-right) if anything is unclear or could be better.",
  },
  guides: [
    {
      key: "common", icon: "🚀", title: "Getting started", intro: "The basics that apply to every profile.",
      sections: [
        { h: "Log in, language & display", steps: [
          "Log in — with your email and password, or via the button at the top.",
          "Language — pick Dutch, English, Spanish, Portuguese, French or Chinese (top-right or bottom).",
          "Theme — one button toggles light, dark and automatic.",
          "Install the app — the install button runs BugaWuga as an app on phone or desktop.",
        ]},
        { h: "Navigating", steps: [
          "Menu — on the left (desktop) or the bottom bar (mobile). Numbers next to an item show what's new or open.",
          "Overview — your home page with the key things at a glance.",
        ]},
        { h: "Chat & agreements", steps: [
          "Chat — available wherever you deal with another party (marketplace, profile, shipment).",
          "Quick questions — shortcut buttons help you ask the right thing fast.",
          "Agreement — a made agreement stays pinned at the top of the chat for both parties.",
        ]},
        { h: "Notifications, profile & feedback", steps: [
          "Notifications — the bell shows unread updates.",
          "Profile & verification — manage your details under My account; a ✓ means verified.",
          "Feedback — the 💬 button sends remarks straight to the team.",
        ]},
      ],
    },
    {
      key: "sender", cap: "shipment.create", icon: "📦", title: "Sender — send something",
      intro: "From creating a shipment to payment and delivery.",
      sections: [
        { h: "1. Create & check", steps: [
          "Send — enter corridor, recipient, weight and the contents per item.",
          "Free check — instantly see whether it may travel via a traveler and an indicative price.",
        ]},
        { h: "2. Make it visible", steps: [
          "On the marketplace — make your request visible so travelers can see it.",
          "Public (optional) — also show it anonymously on the public site (first name + initial only).",
        ]},
        { h: "3. Offer, agreement & payment", steps: [
          "Receive an offer — a chat opens automatically when a traveler responds.",
          "Accept & pay — after agreeing you pay; the amount is held until proof of delivery.",
        ]},
        { h: "4. Track & deliver", steps: [
          "Timeline & label — follow every step and open/print the label.",
          "Receipt code — give the 6-digit code to the recipient; delivery is only confirmed once the code matches.",
        ]},
        { h: "5. After delivery", steps: [
          "Rate — leave stars for the traveler.",
          "A problem? — open a claim/return, or report a user.",
          "Handy — save recipients/products in the address & product book, or use bulk upload.",
        ]},
      ],
    },
    {
      key: "traveler", cap: "trip.create", icon: "🧳", title: "Traveler — offer space",
      intro: "Earn on the side by carrying packages on your trip.",
      sections: [
        { h: "1. Publish a trip", steps: [
          "My trips → New trip — enter corridor, date and capacity.",
          "Make it visible — set your trip visible (optionally anonymously on the public site).",
        ]},
        { h: "2. Offer & agree", steps: [
          "Marketplace — view open requests and place an offer with a message.",
          "Chat — agree the details and price; pin the agreement.",
        ]},
        { h: "3. Carry & deliver", steps: [
          "Status steps — go through the steps up to Delivered.",
          "Receipt code — enter the code the recipient gives you; if it matches, your payout is released.",
        ]},
        { h: "4. Earnings", steps: [
          "Wallet — see your balance and points.",
          "Payout — request a payout once your balance reaches the threshold.",
          "Rate — leave a rating for the sender.",
        ]},
      ],
    },
    {
      key: "ops", cap: "ops.intake", icon: "🏭", title: "Hub / operations — processing",
      intro: "Intake, inspection, custody and transport.",
      sections: [
        { h: "Intake & sealing", steps: [
          "Inspect — run the checklist and seal with a seal number.",
          "Chain of custody — every handover is recorded and cannot be changed.",
        ]},
        { h: "Transport", steps: [
          "Manifests & legs — create a manifest (e.g. a flight), link shipments and advance the status.",
          "Lockers & timeslots — assign a package to a compartment (with pin), book a slot and reconcile stock.",
        ]},
        { h: "Review", steps: [
          "Control Center — handle the review queue and approve or reject shipments.",
        ]},
      ],
    },
    {
      key: "admin", cap: "control.view", icon: "🛡️", title: "Management — steering & oversight",
      intro: "Overview, safety, insight and content.",
      sections: [
        { h: "Oversight & safety", steps: [
          "Control Center — review shipments, set a kill switch per corridor, resolve 🚩 reports.",
          "Test feedback — all submitted feedback arrives here, with user + page.",
        ]},
        { h: "Insight", steps: [
          "Usage & activity — active users (24h/7d/30d), who has been active, the activity funnel and behaviour (page views, check used, clicks).",
          "Analytics — steering information and unit economics.",
        ]},
        { h: "Management & content", steps: [
          "Test Console — drive the simulations (payment, verification).",
          "Content & videos, ads, members — manage what appears on the site and who has access.",
        ]},
      ],
    },
  ],
};

export function getHelp(locale: Locale) {
  return locale === "nl" ? NL : EN;
}
