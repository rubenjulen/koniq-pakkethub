import { requireCapability } from "@/lib/auth";
import { query } from "@/db/client";
import { accountBalance } from "@/lib/finance";
import { StatCard, SectionTitle, Chip } from "@/components/ui";
import { eur } from "@/lib/format";
import { getMessages } from "@/i18n";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const user = await requireCapability("control.view");
  const t = user.tenantId;
  const L = (await getMessages()).ui_anl;

  const [totals] = await query<any>(
    `SELECT
       (SELECT count(*) FROM shipments WHERE tenant_id=$1)::int AS shipments,
       (SELECT count(*) FROM shipments WHERE tenant_id=$1 AND status='DELIVERED')::int AS delivered,
       (SELECT count(*) FROM bookings WHERE tenant_id=$1)::int AS bookings,
       (SELECT coalesce(sum(agreed_price_eur),0) FROM bookings WHERE tenant_id=$1)::float8 AS gmv,
       (SELECT count(*) FROM claims WHERE tenant_id=$1)::int AS claims,
       (SELECT count(*) FROM users WHERE tenant_id=$1)::int AS users`,
    [t]
  );
  const fees = await accountBalance(t, "PLATFORM_FEE");
  const escrow = await accountBalance(t, "ESCROW");
  const payouts = await query<{ s: number }>(`SELECT coalesce(sum(amount_eur),0)::float8 AS s FROM payment_intents WHERE tenant_id=$1 AND purpose='PAYOUT' AND status='SUCCEEDED'`, [t]);
  const elig = await query<{ eligibility: string; n: number }>(
    `SELECT eligibility, count(*)::int AS n FROM shipments WHERE tenant_id=$1 GROUP BY eligibility ORDER BY n DESC`, [t]);

  const gmv = totals.gmv ?? 0;
  const takeRate = gmv > 0 ? (fees / gmv) * 100 : 0;
  const revenuePerShipment = totals.bookings > 0 ? fees / totals.bookings : 0;
  const deliveryRate = totals.shipments > 0 ? (totals.delivered / totals.shipments) * 100 : 0;
  const claimRate = totals.bookings > 0 ? (totals.claims / totals.bookings) * 100 : 0;
  const maxElig = Math.max(1, ...elig.map((e) => e.n));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{L.title}</h1>
        <p className="text-sm text-slate-500">{L.sub}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={L.gmv} value={eur(gmv)} hint={L.gmv_h} />
        <StatCard label={L.fees} value={eur(fees)} hint={L.fees_h} />
        <StatCard label={L.take} value={`${takeRate.toFixed(1)}%`} hint={L.take_h} />
        <StatCard label={L.rev_ship} value={eur(revenuePerShipment)} />
        <StatCard label={L.escrow} value={eur(escrow)} hint={L.escrow_h} />
        <StatCard label={L.payout} value={eur(payouts[0]?.s ?? 0)} />
        <StatCard label={L.deliver} value={`${deliveryRate.toFixed(0)}%`} hint={`${totals.delivered}/${totals.shipments}`} />
        <StatCard label={L.claim} value={`${claimRate.toFixed(1)}%`} hint={`${totals.claims} claims`} />
      </div>

      <section className="ph-card p-4">
        <SectionTitle sub={L.dist_sub}>{L.dist}</SectionTitle>
        <div className="space-y-2">
          {elig.map((e) => (
            <div key={e.eligibility} className="flex items-center gap-3">
              <span className="w-32 shrink-0"><Chip tone={e.eligibility === "ALLOW" ? "ok" : e.eligibility === "REJECT" ? "bad" : "warn"}>{e.eligibility}</Chip></span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-orange-500" style={{ width: `${(e.n / maxElig) * 100}%` }} />
              </div>
              <span className="w-8 text-right text-sm text-slate-600">{e.n}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs text-slate-400">{L.note}</p>
    </div>
  );
}
