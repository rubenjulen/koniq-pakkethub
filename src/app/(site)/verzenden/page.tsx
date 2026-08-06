import { getTenantId, getCorridors, getCategoriesList } from "@/lib/tenant";
import { QuoteCalculator } from "@/components/QuoteCalculator";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verzenden — check je pakket" };

export default async function VerzendenPage() {
  const tenantId = await getTenantId();
  const corridors = await getCorridors(tenantId);
  const pilot = corridors.find((c) => c.status === "PILOT") ?? corridors[0];
  const categories = (await getCategoriesList(tenantId)).map((c) => ({
    code: c.code, name: c.name, traveler_eligible: c.traveler_eligible, requires_review: c.requires_review,
    prohibited: c.prohibited, dangerous_goods: c.dangerous_goods,
    max_value_eur: c.max_value_eur != null ? parseFloat(String(c.max_value_eur)) : null,
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <span className="ph-chip bg-orange-50 text-orange-700">Gratis check</span>
      <h1 className="mt-3 text-3xl font-bold text-slate-900">Mag mijn pakket via een reiziger?</h1>
      <p className="mt-2 text-slate-600">
        Geef de inhoud aan en zie meteen of het via crowdshipping mag, naar freight moet, of geweigerd wordt —
        plus een indicatieve prijs. Dezelfde regels als in de app.
      </p>
      <div className="mt-6">
        <QuoteCalculator categories={categories} corridor={{ ...pilot, name: pilot.name }} />
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[["📋", "Volledige aangifte", "Elk item met omschrijving, aantal en waarde."],
          ["🔍", "Open inspectie", "De hub controleert en verzegelt je pakket."],
          ["💬", "Chat & afspraak", "Overleg met de reiziger en leg de overdracht vast."]].map(([i, t, d]) => (
          <div key={t} className="ph-card p-4">
            <div className="text-2xl">{i}</div>
            <div className="mt-2 font-semibold text-slate-800">{t}</div>
            <div className="text-sm text-slate-500">{d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
