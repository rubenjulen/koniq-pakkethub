import Link from "next/link";
import { requireCapability } from "@/lib/auth";
import { query } from "@/db/client";
import { EmptyState, Chip } from "@/components/ui";
import { eur, dateNL } from "@/lib/format";
import { getMessages } from "@/i18n";

export const metadata = { title: "Ritten & aanbod" };

export default async function MarketplacePage() {
  const user = await requireCapability("offer.create");
  const mk = (await getMessages()).market;
  const rows = await query<any>(
    `SELECT s.id, s.reference, s.recipient_city, s.recipient_country, s.deadline,
            s.declared_weight_kg::float8 AS kg, s.total_declared_value_eur::float8 AS value,
            c.name AS corridor,
            (SELECT count(*) FROM shipment_items i WHERE i.shipment_id=s.id)::int AS items,
            (SELECT count(*) FROM offers o WHERE o.shipment_id=s.id AND o.traveler_id=$2 AND o.status='OPEN')::int AS my_offer
       FROM shipments s JOIN corridors c ON c.id=s.corridor_id
      WHERE s.tenant_id=$1 AND s.eligibility='ALLOW' AND s.status IN ('QUOTED','SCREENING')
      ORDER BY s.deadline NULLS LAST, s.created_at DESC`,
    [user.tenantId, user.id]
  );

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{mk.title}</h1>
          <p className="text-sm text-slate-500">{mk.sub}</p>
        </div>
        <Link href="/app/trips" className="ph-btn ph-btn-ghost text-sm">{mk.my_trips}</Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="🧳" title={mk.none}>{mk.none_d}</EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((s) => (
            <Link key={s.id} href={`/app/marketplace/${s.id}`} className="ph-card block p-4 hover:border-orange-300">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-slate-800">{s.reference}</span>
                <Chip tone="ok">{s.my_offer > 0 ? mk.bid_running : mk.allowed}</Chip>
              </div>
              <div className="mt-1 text-sm text-slate-700">{s.corridor}</div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>→ {s.recipient_city}, {s.recipient_country}</span>
                <span>{s.kg ?? "?"} kg</span>
                <span>{s.items} {mk.items} · {eur(s.value)}</span>
                <span>{mk.deadline} {dateNL(s.deadline)}</span>
              </div>
              <div className="mt-3 text-sm font-medium text-orange-600">{mk.view_bid}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
