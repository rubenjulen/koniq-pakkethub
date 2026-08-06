import Link from "next/link";
import { getMessages } from "@/i18n";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prijzen" };

export default async function Pricing() {
  const p = (await getMessages()).pricing;
  const COMPONENTS: [string, string][] = [
    [p.c1_t, p.c1_d], [p.c2_t, p.c2_d], [p.c3_t, p.c3_d], [p.c4_t, p.c4_d],
  ];
  const ROWS: [string, string][] = [["Tot 2 kg", "€16 – €24"], ["2 – 5 kg", "€24 – €48"], ["5 – 10 kg", "€38 – €88"]];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">{p.title}</h1>
      <p className="mt-2 max-w-2xl text-slate-600">{p.intro}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {COMPONENTS.map(([t, d]) => (
          <div key={t} className="ph-card p-5">
            <h3 className="font-semibold text-slate-900">{t}</h3>
            <p className="mt-1 text-sm text-slate-500">{d}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 ph-card overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700">{p.table_h}</div>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-slate-400"><th className="px-5 py-2">{p.th_weight}</th><th>{p.th_total}</th><th>{p.th_time}</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {ROWS.map((r) => (
              <tr key={r[0]}><td className="px-5 py-2.5 font-medium text-slate-700">{r[0]}</td><td>{r[1]}</td><td className="text-slate-500">{p.depends}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">{p.note}</p>

      <div className="mt-8">
        <Link href="/verzenden" className="ph-btn ph-btn-primary">{p.cta}</Link>
      </div>
    </div>
  );
}
