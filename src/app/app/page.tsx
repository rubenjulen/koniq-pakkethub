import Link from "next/link";
import { requireSession, hasCapability } from "@/lib/auth";
import { query } from "@/db/client";
import { StatCard, EligibilityBadge, StatusBadge, EmptyState, SectionTitle } from "@/components/ui";
import { InstallAppButton } from "@/components/InstallAppButton";
import { eur, dateNL } from "@/lib/format";
import { getMessages } from "@/i18n";

export const metadata = { title: "Overzicht" };

export default async function AppHome() {
  const user = await requireSession();
  const d = (await getMessages()).dash;
  const isSender = hasCapability(user, "shipment.create");
  const isTraveler = hasCapability(user, "offer.create");
  const isOps = hasCapability(user, "ops.review");

  // Sender: eigen zendingen. Traveler: open zendingen + eigen aanbod. Ops: review-queue.
  const myShipments = isSender
    ? await query<any>(
        `SELECT s.id, s.reference, s.status, s.eligibility, s.recipient_city, s.deadline,
                s.total_declared_value_eur::float8 AS value,
                (SELECT count(*) FROM offers o WHERE o.shipment_id = s.id AND o.status='OPEN')::int AS offers
           FROM shipments s WHERE s.tenant_id = $1 AND s.sender_id = $2
          ORDER BY s.created_at DESC LIMIT 5`,
        [user.tenantId, user.id]
      )
    : [];

  const openForTravel = isTraveler
    ? await query<any>(
        `SELECT s.id, s.reference, s.recipient_city, s.deadline, s.declared_weight_kg::float8 AS kg,
                c.name AS corridor
           FROM shipments s JOIN corridors c ON c.id = s.corridor_id
          WHERE s.tenant_id = $1 AND s.eligibility='ALLOW' AND s.status IN ('QUOTED','SCREENING')
          ORDER BY s.deadline NULLS LAST LIMIT 5`,
        [user.tenantId]
      )
    : [];

  const reviewQueue = isOps
    ? await query<any>(
        `SELECT s.id, s.reference, s.eligibility, s.recipient_city
           FROM shipments s
          WHERE s.tenant_id = $1 AND s.eligibility IN ('REVIEW','HOLD','STEP_UP')
          ORDER BY s.created_at DESC LIMIT 6`,
        [user.tenantId]
      )
    : [];

  const counts = await query<{ k: string; n: number }>(
    `SELECT 'shipments' AS k, count(*)::int AS n FROM shipments WHERE tenant_id=$1
     UNION ALL SELECT 'delivered', count(*)::int FROM shipments WHERE tenant_id=$1 AND status='DELIVERED'
     UNION ALL SELECT 'review', count(*)::int FROM shipments WHERE tenant_id=$1 AND eligibility IN ('REVIEW','HOLD')`,
    [user.tenantId]
  );
  const c = Object.fromEntries(counts.map((r) => [r.k, r.n]));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{d.hello} {user.firstName} 👋</h1>
          <p className="text-sm text-slate-500">{user.roleName} · PakketHub NL–SR pilot</p>
        </div>
        <InstallAppButton label={d.install_as_app} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={d.stat_shipments} value={c.shipments ?? 0} />
        <StatCard label={d.stat_delivered} value={c.delivered ?? 0} />
        <StatCard label={d.stat_review} value={c.review ?? 0} />
        <StatCard label={d.stat_corridor} value="NL→SR" hint={d.pilot_active} />
      </div>

      {isSender && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle sub={d.my_shipments_sub}>{d.my_shipments}</SectionTitle>
            <Link href="/app/shipments/new" className="ph-btn ph-btn-primary text-sm">{d.add_package}</Link>
          </div>
          {myShipments.length === 0 ? (
            <EmptyState icon="📦" title={d.no_shipments}>
              {d.no_shipments_d}
            </EmptyState>
          ) : (
            <div className="ph-card divide-y divide-slate-100">
              {myShipments.map((s) => (
                <Link key={s.id} href={`/app/shipments/${s.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-slate-50">
                  <div className="min-w-0">
                    <div className="font-mono text-sm font-semibold text-slate-800">{s.reference}</div>
                    <div className="text-xs text-slate-500">{d.to} {s.recipient_city} · {d.deadline} {dateNL(s.deadline)} · {eur(s.value)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.offers > 0 && <span className="ph-chip bg-orange-50 text-orange-700">{s.offers} {d.offer}</span>}
                    <EligibilityBadge decision={s.eligibility} />
                    <StatusBadge status={s.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {isTraveler && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle sub={d.open_for_travel_sub}>{d.open_for_travel}</SectionTitle>
            <Link href="/app/marketplace" className="text-sm font-medium text-orange-600 hover:underline">{d.view_all}</Link>
          </div>
          {openForTravel.length === 0 ? (
            <EmptyState icon="🧳" title={d.no_open}>{d.no_open_d}</EmptyState>
          ) : (
            <div className="ph-card divide-y divide-slate-100">
              {openForTravel.map((s) => (
                <Link key={s.id} href={`/app/marketplace/${s.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-slate-50">
                  <div>
                    <div className="font-mono text-sm font-semibold text-slate-800">{s.reference}</div>
                    <div className="text-xs text-slate-500">{s.corridor} · {s.kg ?? "?"} kg · {d.deadline} {dateNL(s.deadline)}</div>
                  </div>
                  <span className="ph-btn ph-btn-ghost text-xs">{d.view_and_bid}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {isOps && (
        <section>
          <SectionTitle sub={d.review_queue_sub}>{d.review_queue}</SectionTitle>
          {reviewQueue.length === 0 ? (
            <EmptyState icon="✅" title={d.queue_empty}>{d.queue_empty_d}</EmptyState>
          ) : (
            <div className="ph-card divide-y divide-slate-100">
              {reviewQueue.map((s) => (
                <Link key={s.id} href={`/app/control/${s.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-slate-50">
                  <div className="font-mono text-sm font-semibold text-slate-800">{s.reference}
                    <span className="ml-2 font-sans text-xs font-normal text-slate-500">→ {s.recipient_city}</span>
                  </div>
                  <EligibilityBadge decision={s.eligibility} />
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
