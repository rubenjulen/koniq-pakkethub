import { requireCapability } from "@/lib/auth";
import { query } from "@/db/client";
import { StatCard, SectionTitle, Chip, EmptyState } from "@/components/ui";
import { Sparkline } from "@/components/Sparkline";
import { dateTimeNL, timeAgo } from "@/lib/format";
import { getMessages } from "@/i18n";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gebruik & activiteit" };

const TZ = "America/Paramaribo";

export default async function InsightsPage() {
  const user = await requireCapability("control.view");
  const t = user.tenantId;
  const m = await getMessages();
  const L = m.ins;

  // Kerncijfers — actieve gebruikers via sessions (elke login = een sessie-rij).
  const [k] = await query<any>(
    `SELECT
       (SELECT count(DISTINCT user_id) FROM sessions WHERE tenant_id=$1 AND created_at >= now() - interval '1 day')::int  AS dau,
       (SELECT count(DISTINCT user_id) FROM sessions WHERE tenant_id=$1 AND created_at >= now() - interval '7 days')::int AS wau,
       (SELECT count(DISTINCT user_id) FROM sessions WHERE tenant_id=$1 AND created_at >= now() - interval '30 days')::int AS mau,
       (SELECT count(*) FROM users WHERE tenant_id=$1 AND active)::int AS members,
       (SELECT count(*) FROM users WHERE tenant_id=$1 AND created_at >= now() - interval '7 days')::int AS new7`,
    [t]
  );

  // Actieve gebruikers per dag (14 dagen, Suriname-tijd) — voor de sparkline.
  const daily = await query<any>(
    `SELECT (created_at AT TIME ZONE '${TZ}')::date AS d, count(DISTINCT user_id)::int AS u
       FROM sessions WHERE tenant_id=$1 AND created_at >= now() - interval '14 days'
      GROUP BY d ORDER BY d`,
    [t]
  );
  const days: { key: string; label: string; u: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const dt = new Date(Date.now() - i * 86400000);
    const key = dt.toISOString().slice(0, 10);
    const hit = daily.find((r) => String(r.d).slice(0, 10) === key);
    days.push({ key, label: String(dt.getDate()), u: hit?.u ?? 0 });
  }

  // Wie is er actief geweest — ledenlijst met laatste login + logins/acties (30d).
  const membersRows = await query<any>(
    `SELECT u.id, u.name, u.last_login_at, r.key AS role,
            (SELECT count(*) FROM sessions s WHERE s.user_id=u.id AND s.created_at >= now() - interval '30 days')::int AS logins,
            (SELECT count(*) FROM audit_log a WHERE a.user_id=u.id AND a.created_at >= now() - interval '30 days')::int AS actions
       FROM users u LEFT JOIN roles r ON r.id=u.role_id
      WHERE u.tenant_id=$1 AND u.active
      ORDER BY u.last_login_at DESC NULLS LAST, actions DESC LIMIT 25`,
    [t]
  );

  // Activiteitstrechter — grove funnel op basis van bestaande records.
  const [f] = await query<any>(
    `SELECT
       (SELECT count(*) FROM users WHERE tenant_id=$1 AND active)::int AS registered,
       (SELECT count(DISTINCT user_id) FROM sessions WHERE tenant_id=$1)::int AS loggedin,
       (SELECT count(DISTINCT sender_id) FROM shipments WHERE tenant_id=$1)::int AS shipment,
       (SELECT count(DISTINCT traveler_id) FROM offers WHERE tenant_id=$1)::int AS offer,
       (SELECT count(*) FROM bookings WHERE tenant_id=$1)::int AS booking,
       (SELECT count(*) FROM shipments WHERE tenant_id=$1 AND status='DELIVERED')::int AS delivered`,
    [t]
  );
  const funnel: [string, number][] = [
    [L.f_registered, f.registered], [L.f_loggedin, f.loggedin], [L.f_shipment, f.shipment],
    [L.f_offer, f.offer], [L.f_booking, f.booking], [L.f_delivered, f.delivered],
  ];
  const fmax = Math.max(1, ...funnel.map(([, v]) => v));

  // Top-acties (30d) + feedback.
  const topActions = await query<any>(
    `SELECT action, count(*)::int AS n FROM audit_log
      WHERE tenant_id=$1 AND created_at >= now() - interval '30 days'
      GROUP BY action ORDER BY n DESC LIMIT 8`, [t]
  );
  const [fb] = await query<any>(
    `SELECT count(*)::int AS total, count(*) FILTER (WHERE status <> 'DONE')::int AS open FROM feedback WHERE tenant_id=$1`, [t]
  );

  // Event-laag (gedrag): top-events + meest bekeken pagina's (30d).
  const topEvents = await query<any>(
    `SELECT name, count(*)::int AS n FROM events
      WHERE tenant_id=$1 AND created_at >= now() - interval '30 days'
      GROUP BY name ORDER BY n DESC LIMIT 8`, [t]
  );
  const topPages = await query<any>(
    `SELECT coalesce(path,'—') AS path, count(*)::int AS n FROM events
      WHERE tenant_id=$1 AND name='page_view' AND created_at >= now() - interval '30 days'
      GROUP BY path ORDER BY n DESC LIMIT 8`, [t]
  );
  const [pv] = await query<any>(
    `SELECT count(*)::int AS n FROM events WHERE tenant_id=$1 AND name='page_view' AND created_at >= now() - interval '7 days'`, [t]
  );

  const roleLabel = (key?: string) => (key ? (m.appnav as Record<string, string>)[key.toLowerCase()] ?? key : "—");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">📈 {L.title}</h1>
        <p className="text-sm text-slate-500">{L.sub}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label={L.dau} value={k.dau} hint={L.active_hint} />
        <StatCard label={L.wau} value={k.wau} hint={L.active_hint} />
        <StatCard label={L.mau} value={k.mau} hint={L.active_hint} />
        <StatCard label={L.members} value={k.members} />
        <StatCard label={L.new7} value={`+${k.new7}`} />
        <StatCard label={L.pageviews} value={pv?.n ?? 0} hint={L.pageviews_hint} />
      </div>

      <section className="ph-card p-5">
        <SectionTitle sub={L.logins_sub}>{L.logins_title}</SectionTitle>
        <Sparkline values={days.map((d) => d.u)} labels={days.map((d) => d.label)} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <SectionTitle sub={L.members_sub}>{L.members_title}</SectionTitle>
          {membersRows.length === 0 ? (
            <EmptyState icon="👥" title={L.none} />
          ) : (
            <div className="ph-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-slate-400">
                    <th className="p-3">{L.col_member}</th><th>{L.col_last}</th>
                    <th className="text-right">{L.col_logins}</th><th className="p-3 text-right">{L.col_actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {membersRows.map((u) => (
                    <tr key={u.id}>
                      <td className="p-3">
                        <div className="font-medium text-slate-800">{u.name}</div>
                        <div className="text-xs text-slate-400">{roleLabel(u.role)}</div>
                      </td>
                      <td className="text-slate-600">{u.last_login_at ? timeAgo(u.last_login_at) : <span className="text-slate-400">{L.never}</span>}</td>
                      <td className="text-right font-medium tabular-nums">{u.logins}</td>
                      <td className="p-3 text-right font-medium tabular-nums">{u.actions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section>
            <SectionTitle sub={L.funnel_sub}>{L.funnel_title}</SectionTitle>
            <div className="ph-card space-y-2 p-4">
              {funnel.map(([label, v]) => (
                <div key={label}>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{label}</span>
                    <span className="font-semibold tabular-nums text-slate-800">{v}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.round((v / fmax) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle sub={L.actions_sub}>{L.actions_title}</SectionTitle>
            <div className="ph-card divide-y divide-slate-100 text-sm">
              {topActions.length === 0 ? <p className="p-3 text-slate-400">{L.none}</p> :
                topActions.map((a) => (
                  <div key={a.action} className="flex items-center justify-between p-3">
                    <span className="font-mono text-xs text-slate-600">{a.action}</span>
                    <Chip>{a.n}</Chip>
                  </div>
                ))}
            </div>
          </section>

          <section>
            <SectionTitle>{L.feedback_title}</SectionTitle>
            <div className="ph-card flex items-center justify-between p-4 text-sm">
              <span className="text-slate-600">{L.feedback_open}</span>
              <span className="font-bold text-slate-900">{fb?.open ?? 0} <span className="font-normal text-slate-400">/ {fb?.total ?? 0}</span></span>
            </div>
          </section>
        </div>
      </div>

      <section>
        <SectionTitle sub={L.ev_sub}>{L.ev_title}</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="ph-card p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{L.ev_events}</div>
            {topEvents.length === 0 ? <p className="text-sm text-slate-400">{L.ev_empty}</p> : (
              <div className="divide-y divide-slate-100 text-sm">
                {topEvents.map((e) => (
                  <div key={e.name} className="flex items-center justify-between py-2">
                    <span className="font-mono text-xs text-slate-600">{e.name}</span>
                    <Chip>{e.n}</Chip>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="ph-card p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{L.ev_pages}</div>
            {topPages.length === 0 ? <p className="text-sm text-slate-400">{L.ev_empty}</p> : (
              <div className="divide-y divide-slate-100 text-sm">
                {topPages.map((p, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-2">
                    <span className="truncate font-mono text-xs text-slate-600">{p.path}</span>
                    <span className="shrink-0 font-medium tabular-nums text-slate-700">{p.n}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <p className="text-xs text-slate-400">{L.note}</p>
    </div>
  );
}
