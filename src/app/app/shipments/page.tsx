import Link from "next/link";
import { requireCapability } from "@/lib/auth";
import { query } from "@/db/client";
import { EligibilityBadge, StatusBadge, EmptyState } from "@/components/ui";
import { eur, dateNL } from "@/lib/format";
import { getMessages } from "@/i18n";

export const metadata = { title: "Mijn zendingen" };

export default async function ShipmentsPage() {
  const user = await requireCapability("shipment.create");
  const d = (await getMessages()).dash;
  const rows = await query<any>(
    `SELECT s.id, s.reference, s.status, s.eligibility, s.recipient_name, s.recipient_city,
            s.deadline, s.total_declared_value_eur::float8 AS value, s.created_at,
            (SELECT count(*) FROM offers o WHERE o.shipment_id=s.id AND o.status='OPEN')::int AS offers
       FROM shipments s WHERE s.tenant_id=$1 AND s.sender_id=$2
      ORDER BY s.created_at DESC`,
    [user.tenantId, user.id]
  );

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{d.my_shipments}</h1>
          <p className="text-sm text-slate-500">{rows.length} · {d.stat_shipments.toLowerCase()}</p>
        </div>
        <Link href="/app/shipments/new" className="ph-btn ph-btn-primary text-sm">{d.add_package}</Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="📦" title={d.no_shipments}>{d.no_shipments_d}</EmptyState>
      ) : (
        <div className="ph-card divide-y divide-slate-100">
          {rows.map((s) => (
            <Link key={s.id} href={`/app/shipments/${s.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-slate-50">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-slate-800">{s.reference}</span>
                  {s.offers > 0 && <span className="ph-chip bg-orange-50 text-orange-700">{s.offers} {d.offer}</span>}
                </div>
                <div className="text-xs text-slate-500">
                  {s.recipient_name} · {s.recipient_city} · {d.deadline} {dateNL(s.deadline)} · {eur(s.value)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <EligibilityBadge decision={s.eligibility} />
                <StatusBadge status={s.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
