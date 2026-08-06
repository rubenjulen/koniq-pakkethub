import Link from "next/link";
import { InstallAppButton } from "@/components/InstallAppButton";
import { AirportHero } from "@/components/AirportHero";
import { HeroVideo } from "@/components/HeroVideo";
import { VideoEmbed } from "@/components/VideoEmbed";

const VIDEOS: [string, string][] = [
  ["O_RucR2okRY", "PakketHub — zo werkt gecontroleerde corridor-crowdshipping"],
  ["z2wXH9ZCQSM", "Van aangifte tot levering: de reis van je pakket"],
];

const MODES = [
  ["📦", "Verstuur een pakket", "Aangegeven, open en inspecteerbaar. Verzegeld bij de hub en veilig overgedragen.", "/verzenden"],
  ["🧳", "Reis & verdien", "Onderweg naar Suriname? Neem gecontroleerde pakketten mee en verdien bij.", "/hoe-het-werkt"],
  ["🏭", "Hubs & service points", "Inleveren, inspectie, verzegeling en ophalen op vaste punten.", "/hoe-het-werkt"],
  ["🚚", "Professionele freight", "Zwaar, commercieel of complex? Via een gelicentieerde vervoerder.", "/prijzen"],
];

const SPINE = [
  ["Positieve lijst", "Alleen goedgekeurde categorieën gaan via een reiziger. De rest wordt geweigerd of naar freight geleid."],
  ["Geverifieerde identiteit", "Afzender, reiziger en ontvanger worden geverifieerd vóórdat er waarde beweegt."],
  ["Open inspectie & verzegeling", "Elk pakket wordt geïnspecteerd, gefotografeerd en verzegeld. Geen mystery packages."],
  ["Chain of custody", "Elke overdracht wordt vastgelegd in een onwijzigbaar custody-logboek."],
  ["Beschermde betaling", "Betaling wordt vastgehouden en pas vrijgegeven na bewijs van levering."],
  ["Chat tussen partijen", "Afzender en reiziger overleggen en maken afspraken — veilig in de app."],
];

export default function HomePage() {
  return (
    <>
      {/* Hero met full-bleed achtergrondvideo (luchthaven-illustratie als fallback eronder) */}
      <section className="relative flex min-h-[88vh] w-full items-center overflow-hidden bg-[#2e2e2e] text-white">
        <AirportHero className="absolute inset-0 h-full w-full" />
        <HeroVideo src="/media/hero.mp4" poster="/media/hero-poster.jpg" />
        {/* Leesbaarheids-lagen: horizontaal verloop + onder-vignet zodat tekst leesbaar blijft */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/85 to-[#141414]/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414]/80 via-transparent to-[#141414]/40" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-8 px-4 py-20 lg:grid-cols-2 lg:items-center">
          <div className="[text-shadow:0_1px_16px_rgba(0,0,0,0.6)]">
            <span className="ph-chip bg-orange-600 text-white shadow-lg [text-shadow:none]">Pilot: Nederland → Suriname</span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight text-white sm:text-5xl">
              Eén <span className="text-orange-400">gecontroleerde</span> corridor voor je pakketten.
            </h1>
            <p className="mt-4 max-w-lg text-lg font-medium text-slate-100">
              PakketHub verbindt afzenders, reizigers, hubs en logistieke partners. Aangifte, inspectie,
              verzegeling en veilige overdracht — met chat tussen de partijen en betaling die wordt
              vastgehouden tot levering.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 [text-shadow:none]">
              <Link href="/verzenden" className="ph-btn ph-btn-primary shadow-lg">Pakket versturen</Link>
              <Link href="/hoe-het-werkt" className="ph-btn bg-white/15 text-white ring-1 ring-white/25 backdrop-blur hover:bg-white/25">Hoe het werkt</Link>
            </div>
            <div className="mt-6 [text-shadow:none]"><InstallAppButton label="Installeer de app op je toestel" /></div>
          </div>
          <div className="hidden lg:block">
            {/* Solide donkere kaart met blur zodat de stappen goed leesbaar zijn boven de video */}
            <div className="rounded-2xl border border-white/10 bg-[#1c1c1c]/85 p-6 text-sm text-slate-100 shadow-2xl backdrop-blur-md">
              <div className="mb-4 flex items-center gap-2 font-semibold text-white">
                <span className="h-2 w-2 rounded-full bg-orange-500" /> Zo werkt een zending
              </div>
              <ol className="space-y-3">
                {["Afzender geeft de inhoud aan → automatische check op de positieve lijst",
                  "Reiziger biedt aan → chat opent tussen beide partijen",
                  "Hub inspecteert & verzegelt → custody-log start",
                  "Onderweg, douane, aangekomen → status live te volgen",
                  "Afgeleverd → betaling vrijgegeven"].map((t, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">{i + 1}</span>
                    <span className="leading-relaxed">{t}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Service modes */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-bold text-slate-900">Elke verzending, de juiste vorm</h2>
        <p className="mt-1 text-slate-500">We behandelen niet alles als hetzelfde. Kies bewust — of laat de app het bepalen.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODES.map(([icon, title, desc, href]) => (
            <Link key={title} href={href} className="ph-card group p-5 transition hover:border-orange-300 hover:shadow-sm">
              <div className="text-3xl">{icon}</div>
              <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-500">{desc}</p>
              <span className="mt-3 inline-block text-sm font-medium text-orange-600 group-hover:underline">Meer →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Video's */}
      <section className="bg-[#2e2e2e] py-16 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">Zie PakketHub in actie</h2>
              <p className="mt-1 max-w-2xl text-slate-300">
                Van check-in op de luchthaven tot veilige overdracht — bekijk hoe de gecontroleerde corridor werkt.
              </p>
            </div>
            <span className="ph-chip bg-white/10 text-slate-200">🔒 Privacyvriendelijk — laadt pas na je klik</span>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {VIDEOS.map(([id, title]) => <VideoEmbed key={id} id={id} title={title} />)}
          </div>
        </div>
      </section>

      {/* Trust spine */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-bold text-slate-900">Veiligheid zit in het ontwerp</h2>
          <p className="mt-1 max-w-2xl text-slate-500">
            Geen loze belofte, maar controles die in elke stap zijn ingebouwd. Zo houden we crowdshipping betrouwbaar.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SPINE.map(([title, desc]) => (
              <div key={title} className="ph-card p-5">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-orange-700">✓</span>
                  <h3 className="font-semibold text-slate-900">{title}</h3>
                </div>
                <p className="mt-2 text-sm text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link href="/trust" className="ph-btn ph-btn-ghost">Lees het Trust Center →</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="ph-card flex flex-col items-center gap-4 bg-gradient-to-br from-orange-600 to-slate-800 p-10 text-center text-white">
          <h2 className="text-2xl font-bold">Klaar om je eerste pakket te sturen?</h2>
          <p className="max-w-lg text-orange-50">
            Doe de gratis check: geef je inhoud aan en zie meteen of het via een reiziger mag en wat het ongeveer kost.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/verzenden" className="ph-btn bg-white text-slate-900 hover:bg-slate-100">Check & verstuur</Link>
            <Link href="/partner" className="ph-btn bg-white/15 text-white hover:bg-white/25">Partner worden</Link>
          </div>
        </div>
      </section>
    </>
  );
}
