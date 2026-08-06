import { getTenantId, getCorridors, getCategoriesList } from "@/lib/tenant";
import { QuoteCalculator } from "@/components/QuoteCalculator";
import { getMessages } from "@/i18n";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verzenden — check je pakket" };

export default async function VerzendenPage() {
  const tenantId = await getTenantId();
  const m = await getMessages();
  const S = m.send;
  const corridors = await getCorridors(tenantId);
  const pilot = corridors.find((c) => c.status === "PILOT") ?? corridors[0];
  const categories = (await getCategoriesList(tenantId)).map((c) => ({
    code: c.code, name: c.name, traveler_eligible: c.traveler_eligible, requires_review: c.requires_review,
    prohibited: c.prohibited, dangerous_goods: c.dangerous_goods,
    max_value_eur: c.max_value_eur != null ? parseFloat(String(c.max_value_eur)) : null,
  }));

  const FEATURES: [string, string, string][] = [
    ["📋", S.f1_t, S.f1_d], ["🔍", S.f2_t, S.f2_d], ["💬", S.f3_t, S.f3_d],
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <span className="ph-chip bg-orange-50 text-orange-700">{S.badge}</span>
      <h1 className="mt-3 text-3xl font-bold text-slate-900">{S.title}</h1>
      <p className="mt-2 text-slate-600">{S.intro}</p>
      <div className="mt-6">
        <QuoteCalculator categories={categories} corridor={{ ...pilot, name: pilot.name }} t={S} eligLabels={m.elig} />
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {FEATURES.map(([i, t, dd]) => (
          <div key={t} className="ph-card p-4">
            <div className="text-2xl">{i}</div>
            <div className="mt-2 font-semibold text-slate-800">{t}</div>
            <div className="text-sm text-slate-500">{dd}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
