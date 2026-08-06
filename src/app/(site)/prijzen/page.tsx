import Link from "next/link";

export const metadata = { title: "Prijzen" };

const COMPONENTS = [
  ["Servicekosten PakketHub", "Vaste bijdrage per zending voor platform, verificatie en beschermde betaling."],
  ["Vervoersvergoeding", "Het bod van de reiziger of het tarief van de vervoerder — meestal op basis van gewicht."],
  ["Hub-handling", "Intake, inspectie, verzegeling en eventueel herverpakken."],
  ["Douane & heffingen", "Eventuele invoerrechten/heffingen zijn afhankelijk van inhoud en waarde en vallen buiten PakketHub."],
];

export default function Pricing() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">Eerlijke, opgebouwde prijs</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Geen verstopte kosten. We laten de onderdelen zien en verbergen douaneheffingen of variabele partnerkosten niet.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {COMPONENTS.map(([t, d]) => (
          <div key={t} className="ph-card p-5">
            <h3 className="font-semibold text-slate-900">{t}</h3>
            <p className="mt-1 text-sm text-slate-500">{d}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 ph-card overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700">Indicatie crowdshipping (NL → SR)</div>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-slate-400"><th className="px-5 py-2">Gewicht</th><th>Indicatie totaal</th><th>Doorlooptijd*</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {[["Tot 2 kg", "€16 – €24", "afhankelijk van reisagenda"],
              ["2 – 5 kg", "€24 – €48", "afhankelijk van reisagenda"],
              ["5 – 10 kg", "€38 – €88", "afhankelijk van reisagenda"]].map((r) => (
              <tr key={r[0]}><td className="px-5 py-2.5 font-medium text-slate-700">{r[0]}</td><td>{r[1]}</td><td className="text-slate-500">{r[2]}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        * PakketHub publiceert geen gegarandeerde levertijden of dekkingsclaims voordat deze zijn gemeten en geverifieerd.
        Indicaties zijn exclusief eventuele douaneheffingen.
      </p>

      <div className="mt-8">
        <Link href="/verzenden" className="ph-btn ph-btn-primary">Bereken jouw indicatie →</Link>
      </div>
    </div>
  );
}
