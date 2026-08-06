import Link from "next/link";
import { requireCapability } from "@/lib/auth";
import { query } from "@/db/client";
import { StatCard, EligibilityBadge, EmptyState, SectionTitle, Chip } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import { toggleKillSwitchAction } from "./actions";
import { getMessages } from "@/i18n";

export const metadata = { title: "Control Center" };

export default async function ControlCenter() {
  const user = await requireCapability("control.view");
  const t = user.tenantId;
  const m = await getMessages();
  const C = m.ctrl, D = m.dash;

  const kri = await query<{ k: string; n: number }>(
    `SELECT 'total' k, count(*)::int n FROM shipments WHERE tenant_id=$1
     UNION ALL SELECT 'review', count(*)::int FROM shipments WHERE tenant_id=$1 AND eligibility IN ('REVIEW','HOLD','STEP_UP')
     UNION ALL SELECT 'reject', count(*)::int FROM shipments WHERE tenant_id=$1 AND eligibility IN ('REJECT','FREIGHT_ONLY')
     UNION ALL SELECT 'delivered', count(*)::int FROM shipments WHERE tenant_id=$1 AND status='DELIVERED'`,
    [t]
  );
  const c = Object.fromEntries(kri.map((r) => [r.k, r.n]));

  const queue = await query<any>(
    `SELECT s.id, s.reference, s.eligibility, s.recipient_city, s.created_at, u.name AS sender
       FROM shipments s JOIN users u ON u.id=s.sender_id
      WHERE s.tenant_id=$1 AND s.eligibility IN ('REVIEW','HOLD','STEP_UP')
      ORDER BY s.created_at DESC`,
    [t]
  );
  const corridors = await query<any>(
    `SELECT id, code, name, status, kill_switch FROM corridors WHERE tenant_id=$1 ORDER BY status DESC, code`, [t]
  );
  const auditRows = await query<any>(
    `SELECT action, summary, created_at, entity_type FROM audit_log WHERE tenant_id=$1 ORDER BY id DESC LIMIT 12`, [t]
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">🛡️ Control Center</h1>
        <p className="text-sm text-slate-500">{C.sub}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={D.stat_shipments} value={c.total ?? 0} />
        <StatCard label={D.stat_review} value={c.review ?? 0} hint="REVIEW / HOLD / STEP_UP" />
        <StatCard label={C.stat_reject} value={c.reject ?? 0} />
        <StatCard label={D.stat_delivered} value={c.delivered ?? 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <SectionTitle sub={C.queue_sub}>{D.review_queue}</SectionTitle>
          {queue.length === 0 ? (
            <EmptyState icon="✅" title={D.queue_empty}>{C.queue_empty_d}</EmptyState>
          ) : (
            <div className="ph-card divide-y divide-slate-100">
              {queue.map((s) => (
                <Link key={s.id} href={`/app/control/${s.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-slate-50">
                  <div>
                    <div className="font-mono text-sm font-semibold text-slate-800">{s.reference}</div>
                    <div className="text-xs text-slate-500">{s.sender} → {s.recipient_city} · {timeAgo(s.created_at)}</div>
                  </div>
                  <EligibilityBadge decision={s.eligibility} />
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section>
            <SectionTitle sub={C.kills_sub}>{C.kills}</SectionTitle>
            <div className="ph-card divide-y divide-slate-100">
              {corridors.map((cor) => (
                <div key={cor.id} className="flex items-center justify-between p-3">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{cor.code}</div>
                    <Chip tone={cor.status === "PILOT" || cor.status === "LIVE" ? "ok" : "neutral"}>{cor.status}</Chip>
                  </div>
                  <form action={toggleKillSwitchAction}>
                    <input type="hidden" name="corridor_id" value={cor.id} />
                    <input type="hidden" name="on" value={(!cor.kill_switch).toString()} />
                    <button className={`ph-btn text-xs ${cor.kill_switch ? "ph-btn-primary" : "ph-btn-ghost"}`}>
                      {cor.kill_switch ? C.blocked : C.block}
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle sub={C.audit_sub}>{C.audit}</SectionTitle>
            <div className="ph-card divide-y divide-slate-100 text-xs">
              {auditRows.map((a, i) => (
                <div key={i} className="p-2.5">
                  <div className="font-medium text-slate-700">{a.action}</div>
                  <div className="text-slate-500">{a.summary} · {timeAgo(a.created_at)}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
