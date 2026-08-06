import Link from "next/link";

export const metadata = { title: "Hoe het werkt" };

const PERSONAS = [
  ["📦", "Afzender", ["Geef je pakket en inhoud volledig aan", "Krijg direct een eligibility-check", "Ontvang aanbiedingen van reizigers", "Chat, spreek af en volg live"], "/verzenden", "Verstuur een pakket"],
  ["🧳", "Reiziger", ["Publiceer je rit en capaciteit", "Bied op passende zendingen", "Haal op bij de hub, verzegeld", "Verdien bij; betaling na levering"], "/aanmelden?role=TRAVELER", "Word reiziger"],
  ["📥", "Ontvanger", ["Ontvang een track-link", "Volg de status van je pakket", "Haal op bij een service point", "Bevestig ontvangst met OTP/QR"], "/track", "Volg een zending"],
  ["🚚", "Partner / fleet", ["Onboarding met KYB & documenten", "Publiceer routes en capaciteit", "Voer legs uit met scan-bewijs", "Afrekening en kwaliteit per fleet"], "/partner", "Word partner"],
];

const STEPS = [
  ["Aangifte & check", "De afzender geeft de inhoud aan. De positieve-lijst-engine bepaalt meteen: toestaan, beoordelen, freight of weigeren."],
  ["Match & chat", "Een reiziger biedt aan. Er opent automatisch een chat waarin beide partijen overleggen en de overdracht afspreken."],
  ["Intake, inspectie & zegel", "Bij de hub wordt het pakket geïnspecteerd, gefotografeerd en verzegeld. De chain of custody start."],
  ["Onderweg & douane", "De zending doorloopt vertrek, douane en aankomst. Elke stap staat in het custody-logboek en is te volgen."],
  ["Levering & uitbetaling", "Na bewijs van levering wordt de vastgehouden betaling vrijgegeven aan de reiziger."],
];

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">Hoe PakketHub werkt</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Voor elke rol een eigen, duidelijke flow — verbonden met dezelfde gecontroleerde corridor en regels.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PERSONAS.map(([icon, title, points, href, cta]) => (
          <div key={title as string} className="ph-card flex flex-col p-5">
            <div className="text-3xl">{icon}</div>
            <h3 className="mt-2 font-semibold text-slate-900">{title}</h3>
            <ul className="mt-2 flex-1 space-y-1 text-sm text-slate-500">
              {(points as string[]).map((p) => <li key={p} className="flex gap-1.5"><span className="text-orange-500">›</span>{p}</li>)}
            </ul>
            <Link href={href as string} className="ph-btn ph-btn-ghost mt-4 text-sm">{cta}</Link>
          </div>
        ))}
      </div>

      <h2 className="mt-16 text-2xl font-bold text-slate-900">Een zending, stap voor stap</h2>
      <ol className="mt-6 space-y-4">
        {STEPS.map(([t, d], i) => (
          <li key={t} className="ph-card flex gap-4 p-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 font-bold text-white">{i + 1}</span>
            <div>
              <h3 className="font-semibold text-slate-900">{t}</h3>
              <p className="text-sm text-slate-500">{d}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
