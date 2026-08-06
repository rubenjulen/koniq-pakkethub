import { requireCapability } from "@/lib/auth";
import { query } from "@/db/client";
import { EmptyState, Chip, SectionTitle } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import { createConsolidationAction, bookFreightAction, addToConsolidationAction, advanceConsolidationAction } from "./actions";

export const metadata = { title: "Warehouse & freight" };

export default async function FreightPage() {
  const user = await requireCapability("ops.intake");
  const t = user.tenantId;
  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500";

  const hubs = await query<any>(`SELECT id, name FROM hubs WHERE tenant_id=$1 AND services @> ARRAY['CONSOLIDATION']`, [t]);
  const consolidations = await query<any>(
    `SELECT c.id, c.reference, c.status, c.created_at, h.name AS hub,
            (SELECT count(*) FROM consolidation_items ci WHERE ci.consolidation_id=c.id)::int AS items
       FROM consolidations c LEFT JOIN hubs h ON h.id=c.hub_id WHERE c.tenant_id=$1 ORDER BY c.created_at DESC`, [t]);
  const consItems = await query<any>(
    `SELECT ci.consolidation_id, s.reference FROM consolidation_items ci JOIN shipments s ON s.id=ci.shipment_id
      WHERE s.tenant_id=$1`, [t]);
  const addable = await query<any>(
    `SELECT id, reference FROM shipments WHERE tenant_id=$1 AND status IN ('SEALED','IN_CUSTODY','READY')
        AND id NOT IN (SELECT shipment_id FROM consolidation_items) ORDER BY created_at DESC LIMIT 20`, [t]);
  const freight = await query<any>(
    `SELECT f.reference, f.carrier_name, f.mode, f.status, f.eta_days, f.created_at, s.reference AS shipment_ref
       FROM freight_orders f LEFT JOIN shipments s ON s.id=f.shipment_id WHERE f.tenant_id=$1 ORDER BY f.created_at DESC`, [t]);
  const freightEligible = await query<any>(
    `SELECT id, reference FROM shipments WHERE tenant_id=$1 AND eligibility IN ('FREIGHT_ONLY','ALLOW') AND status NOT IN ('DELIVERED','CLOSED','IN_TRANSIT') ORDER BY created_at DESC LIMIT 20`, [t]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">🚢 Warehouse & managed freight</h1>
        <p className="text-sm text-slate-500">Consolidatie in het magazijn en professionele vracht (ETA via routing-adapter)</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="ph-card p-4">
          <SectionTitle sub="Bundel zendingen voor uitgaande leg">Consolidaties</SectionTitle>
          <form action={createConsolidationAction} className="mb-3 flex gap-2">
            <select name="hub_id" className={inp}>
              {hubs.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
            <button className="ph-btn ph-btn-primary text-sm">+ Nieuw</button>
          </form>
          {consolidations.length === 0 ? <p className="text-sm text-slate-400">Nog geen consolidaties.</p> : (
            <div className="space-y-3">
              {consolidations.map((c: any) => {
                const items = consItems.filter((ci: any) => ci.consolidation_id === c.id);
                return (
                  <div key={c.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-semibold text-slate-700">{c.reference}</span>
                      <Chip tone={c.status === "OPEN" ? "warn" : "ok"}>{c.status}</Chip>
                    </div>
                    {items.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {items.map((it: any, k: number) => <span key={k} className="ph-chip bg-slate-100 text-slate-600">{it.reference}</span>)}
                      </div>
                    )}
                    {c.status === "OPEN" && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <form action={addToConsolidationAction} className="flex gap-1">
                          <input type="hidden" name="consolidation_id" value={c.id} />
                          <select name="shipment_id" className="rounded border border-slate-300 px-2 py-1 text-xs">
                            <option value="">+ zending…</option>
                            {addable.map((s: any) => <option key={s.id} value={s.id}>{s.reference}</option>)}
                          </select>
                          <button className="ph-btn ph-btn-ghost text-xs">Toevoegen</button>
                        </form>
                        {items.length > 0 && (
                          <form action={advanceConsolidationAction}>
                            <input type="hidden" name="consolidation_id" value={c.id} />
                            <input type="hidden" name="to_status" value="DISPATCHED" />
                            <button className="ph-btn ph-btn-primary text-xs">Verzegel & verzend →</button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="ph-card p-4">
          <SectionTitle sub="Boek een gelicentieerde vervoerder (sandbox)">Freight boeken</SectionTitle>
          <form action={bookFreightAction} className="space-y-2">
            <select name="shipment_id" className={inp}>
              <option value="">— losse boeking —</option>
              {freightEligible.map((s: any) => <option key={s.id} value={s.id}>{s.reference}</option>)}
            </select>
            <input name="carrier_name" placeholder="Vervoerder" className={inp} />
            <select name="mode" className={inp}><option value="AIR">Lucht</option><option value="SEA">Zee</option><option value="ROAD">Weg</option></select>
            <button className="ph-btn ph-btn-primary w-full text-sm">Freight boeken</button>
          </form>
        </section>
      </div>

      <section>
        <SectionTitle>Freight-orders</SectionTitle>
        {freight.length === 0 ? <EmptyState icon="📦" title="Geen freight-orders" /> : (
          <div className="ph-card divide-y divide-slate-100">
            {freight.map((f: any, i: number) => (
              <div key={i} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div>
                  <span className="font-mono font-semibold text-slate-800">{f.reference}</span>
                  <span className="ml-2 text-slate-500">{f.carrier_name} · {f.mode} · ETA {f.eta_days}d{f.shipment_ref ? ` · ${f.shipment_ref}` : ""}</span>
                </div>
                <div className="flex items-center gap-2"><Chip tone={f.status === "DELIVERED" ? "ok" : "warn"}>{f.status}</Chip><span className="text-xs text-slate-400">{timeAgo(f.created_at)}</span></div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
