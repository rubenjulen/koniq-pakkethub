import { requireCapability } from "@/lib/auth";
import { query } from "@/db/client";
import { getCorridors } from "@/lib/tenant";
import { Chip, EmptyState, SectionTitle } from "@/components/ui";
import { eur, dateNL } from "@/lib/format";
import { createTripAction } from "../marketplace/actions";

export const metadata = { title: "Mijn ritten" };

export default async function TripsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireCapability("trip.create");
  const { error } = await searchParams;
  const corridors = (await getCorridors(user.tenantId)).filter((c) => c.status === "PILOT" || c.status === "LIVE");
  const trips = await query<any>(
    `SELECT t.id, t.depart_date, t.arrive_date, t.capacity_kg::float8 AS capacity_kg,
            t.price_indication_eur::float8 AS price, t.notes, t.status, c.name AS corridor
       FROM trips t JOIN corridors c ON c.id=t.corridor_id
      WHERE t.tenant_id=$1 AND t.traveler_id=$2 ORDER BY t.depart_date DESC`,
    [user.tenantId, user.id]
  );
  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-xl font-bold text-slate-900">Mijn ritten</h1>
      {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>}

      <section className="ph-card p-4">
        <SectionTitle sub="Publiceer je capaciteit zodat afzenders je kunnen vinden">Nieuwe rit</SectionTitle>
        <form action={createTripAction} className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium text-slate-600">Corridor</span>
            <select name="corridor_id" className={inp}>
              {corridors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="block"><span className="text-xs font-medium text-slate-600">Vertrekdatum</span><input name="depart_date" type="date" required className={inp} /></label>
          <label className="block"><span className="text-xs font-medium text-slate-600">Aankomstdatum</span><input name="arrive_date" type="date" className={inp} /></label>
          <label className="block"><span className="text-xs font-medium text-slate-600">Capaciteit (kg)</span><input name="capacity_kg" type="number" step="0.5" defaultValue="10" className={inp} /></label>
          <label className="block"><span className="text-xs font-medium text-slate-600">Prijsindicatie (€/kg)</span><input name="price_indication_eur" type="number" step="0.5" className={inp} /></label>
          <label className="block sm:col-span-2"><span className="text-xs font-medium text-slate-600">Notitie</span><input name="notes" className={inp} placeholder="Bijv. ruimte in ruimbagage" /></label>
          <div className="sm:col-span-2"><button className="ph-btn ph-btn-primary">Rit publiceren</button></div>
        </form>
      </section>

      {trips.length === 0 ? (
        <EmptyState icon="✈️" title="Nog geen ritten">Publiceer je eerste rit hierboven.</EmptyState>
      ) : (
        <div className="ph-card divide-y divide-slate-100">
          {trips.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-3">
              <div>
                <div className="text-sm font-semibold text-slate-800">{t.corridor}</div>
                <div className="text-xs text-slate-500">
                  Vertrek {dateNL(t.depart_date)}{t.arrive_date ? ` · aankomst ${dateNL(t.arrive_date)}` : ""} · {t.capacity_kg} kg{t.price ? ` · ${eur(t.price)}/kg` : ""}
                </div>
              </div>
              <Chip tone={t.status === "OPEN" ? "ok" : "neutral"}>{t.status}</Chip>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
