import Link from "next/link";
import { getMessages } from "@/i18n";
import { getTenantId } from "@/lib/tenant";
import { getPublicRoutes, getPublicRequests, getPublicStats } from "@/lib/market";
import { Stars } from "@/components/Stars";
import { eur, monthNL } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Ontdek reizigers & verzoeken",
  description: "Bekijk anoniem welke reizigers ruimte aanbieden en welke pakketten verstuurd willen worden. Maak gratis een account om contact te leggen.",
};

function Ini({ name }: { name: string }) {
  const ini = (name || "?").split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  return <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 font-bold text-orange-700">{ini}</div>;
}

export default async function DiscoverPage() {
  const m = await getMessages();
  const o = m.ontdek;
  const tenantId = await getTenantId();
  const [routes, requests, stats] = await Promise.all([
    getPublicRoutes(tenantId, 24),
    getPublicRequests(tenantId, 24),
    getPublicStats(tenantId),
  ]);
  const empty = routes.length === 0 && requests.length === 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* Hero + sociaal bewijs */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">{o.title}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">{o.intro}</p>
        <div className="mx-auto mt-6 flex max-w-md justify-center gap-3">
          <div className="ph-card flex-1 p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.totalRoutes}</div>
            <div className="text-xs text-slate-500">{o.stat_routes}</div>
          </div>
          <div className="ph-card flex-1 p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.totalRequests}</div>
            <div className="text-xs text-slate-500">{o.stat_requests}</div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/aanmelden" className="ph-btn ph-btn-primary text-sm">{o.cta_join}</Link>
          <Link href="/login" className="ph-btn ph-btn-ghost text-sm">{m.common.login}</Link>
        </div>
      </div>

      {/* Corridor-strip */}
      {stats.corridors.length > 0 && (
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {stats.corridors.map((c) => (
            <span key={c.corridor} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
              {c.corridor} · <span className="text-slate-800">{c.routes}</span> {o.chip_routes} · <span className="text-slate-800">{c.requests}</span> {o.chip_requests}
            </span>
          ))}
        </div>
      )}

      {empty ? (
        <div className="ph-card mx-auto mt-10 max-w-md p-8 text-center">
          <div className="text-4xl">🧭</div>
          <h2 className="mt-2 font-semibold text-slate-800">{o.empty_title}</h2>
          <p className="mt-1 text-sm text-slate-500">{o.empty_sub}</p>
          <Link href="/aanmelden" className="ph-btn ph-btn-primary mt-4 text-sm">{o.cta_join}</Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          {/* Reizigers met ruimte */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900">🧳 {o.routes_title}</h2>
            {routes.length === 0 ? (
              <p className="text-sm text-slate-500">{o.none_routes}</p>
            ) : (
              <div className="space-y-3">
                {routes.map((r) => (
                  <div key={r.id} className="ph-card flex gap-4 p-4">
                    <Ini name={r.display_name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-800">{r.display_name}</span>
                        {r.verified && <span className="text-xs text-orange-600">✓</span>}
                        <Stars value={r.stars} size={13} /><span className="text-xs text-slate-400">({r.stars_n})</span>
                      </div>
                      <div className="text-sm text-slate-600">{r.corridor}</div>
                      {r.short_info && <p className="mt-1 text-sm text-slate-500">{r.short_info}</p>}
                      <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500">
                        <span>{(o as Record<string, string>)[`size_${r.package_size}`] ?? r.package_size}</span>
                        <span>{o.around} {monthNL(r.depart_date)}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-bold text-slate-800">{r.price ? eur(r.price) : o.free}</div>
                      <Link href="/login" className="mt-1 block text-xs font-medium text-orange-600 hover:underline">{o.contact}</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Openstaande verzoeken */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900">📦 {o.requests_title}</h2>
            {requests.length === 0 ? (
              <p className="text-sm text-slate-500">{o.none_requests}</p>
            ) : (
              <div className="space-y-3">
                {requests.map((s) => (
                  <div key={s.id} className="ph-card flex gap-4 p-4">
                    <Ini name={s.display_name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-800">{s.display_name}</span>
                        {s.verified && <span className="text-xs text-orange-600">✓</span>}
                        <Stars value={s.stars} size={13} /><span className="text-xs text-slate-400">({s.stars_n})</span>
                      </div>
                      <div className="text-sm text-slate-600">{s.corridor} · → {s.recipient_country}</div>
                      <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500">
                        {s.kg != null && <span>± {s.kg} kg</span>}
                        {s.deadline && <span>{o.before} {monthNL(s.deadline)}</span>}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-bold text-slate-800">{s.price ? eur(s.price) : o.free}</div>
                      <Link href="/login" className="mt-1 block text-xs font-medium text-orange-600 hover:underline">{o.contact}</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Privacy-notitie */}
      <p className="mx-auto mt-10 max-w-2xl rounded-xl bg-slate-50 px-4 py-3 text-center text-xs text-slate-500 ring-1 ring-slate-200">
        🔒 {o.privacy_note}
      </p>
    </div>
  );
}
