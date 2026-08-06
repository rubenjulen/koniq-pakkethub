import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import { query, queryOne } from "@/db/client";
import { Chip, SectionTitle, EligibilityBadge } from "@/components/ui";
import { eur, dateNL } from "@/lib/format";
import { makeOfferAction } from "../actions";

export const metadata = { title: "Zending bekijken" };

export default async function MarketplaceDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const user = await requireCapability("offer.create");
  const { id } = await params;
  const { error } = await searchParams;

  const s = await queryOne<any>(
    `SELECT s.*, s.total_declared_value_eur::float8 AS value, c.name AS corridor_name
       FROM shipments s JOIN corridors c ON c.id=s.corridor_id
      WHERE s.id=$1 AND s.tenant_id=$2 AND s.eligibility='ALLOW'`,
    [id, user.tenantId]
  );
  if (!s) notFound();

  const items = await query<any>(
    `SELECT description, quantity, unit_value::float8 AS unit_value, category_code FROM shipment_items WHERE shipment_id=$1`, [id]
  );
  const myOffer = await queryOne<any>(
    `SELECT price_eur::float8 AS price, message FROM offers WHERE shipment_id=$1 AND traveler_id=$2 AND status='OPEN'`,
    [id, user.id]
  );
  const trips = await query<any>(
    `SELECT id, depart_date, capacity_kg FROM trips WHERE tenant_id=$1 AND traveler_id=$2 AND status='OPEN' ORDER BY depart_date`,
    [user.tenantId, user.id]
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/app/marketplace" className="text-sm text-orange-600 hover:underline">← Ritten & aanbod</Link>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="font-mono text-xl font-bold text-slate-900">{s.reference}</h1>
          <EligibilityBadge decision={s.eligibility} />
        </div>
        <p className="text-sm text-slate-500">{s.corridor_name} · naar {s.recipient_city}, {s.recipient_country}</p>
      </div>

      {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>}

      <section className="ph-card p-4">
        <SectionTitle sub={`${s.declared_weight_kg ?? "?"} kg · deadline ${dateNL(s.deadline)} · ${eur(s.value)}`}>Inhoud</SectionTitle>
        <ul className="divide-y divide-slate-100 text-sm">
          {items.map((it, i) => (
            <li key={i} className="flex items-center justify-between py-1.5">
              <span>{it.quantity}× {it.description}</span>
              <span className="flex items-center gap-2 text-slate-500"><Chip>{it.category_code}</Chip>{eur(it.unit_value * it.quantity)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="ph-card p-4">
        <SectionTitle sub="Je bod opent meteen een chat met de afzender">
          {myOffer ? "Je bod aanpassen" : "Bied op deze zending"}
        </SectionTitle>
        <form action={makeOfferAction} className="space-y-3">
          <input type="hidden" name="shipment_id" value={s.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Jouw prijs (€)</span>
              <input name="price_eur" type="number" step="0.5" min="0" required defaultValue={myOffer?.price ?? ""}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
            </label>
            {trips.length > 0 && (
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Koppel aan rit (optioneel)</span>
                <select name="trip_id" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="">— geen —</option>
                  {trips.map((t) => <option key={t.id} value={t.id}>{dateNL(t.depart_date)} · {t.capacity_kg} kg</option>)}
                </select>
              </label>
            )}
          </div>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Bericht aan afzender</span>
            <textarea name="message" rows={2} defaultValue={myOffer?.message ?? ""}
              placeholder="Bijv. Ik vlieg volgende week, kan het bij de hub ophalen."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
          </label>
          <button className="ph-btn ph-btn-primary">{myOffer ? "Bod bijwerken" : "Bod plaatsen & chatten"}</button>
        </form>
      </section>
    </div>
  );
}
