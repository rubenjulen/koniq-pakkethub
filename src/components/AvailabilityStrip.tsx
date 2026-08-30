import Link from "next/link";
import { getPublicRoutes, getPublicRequests, getPublicStats } from "@/lib/market";
import { LogoMark } from "@/components/Logo";
import { eur } from "@/lib/format";
import type { Messages } from "@/i18n/messages/nl";

function chipIni(name: string) {
  return (name || "?").split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
}

/**
 * Horizontale "Beschikbaar nu"-strip (native, geen iframe) voor strategische
 * plekken op de site. Toont teller + een paar anonieme listings + CTA.
 */
export async function AvailabilityStrip({ tenantId, m }: { tenantId: string; m: Messages }) {
  const [routes, requests, stats] = await Promise.all([
    getPublicRoutes(tenantId, 3), getPublicRequests(tenantId, 3), getPublicStats(tenantId),
  ]);
  if (stats.totalRoutes + stats.totalRequests === 0) return null;

  const o = m.ontdek;
  const a = m.home;
  type Chip = { userId: string; name: string; corridor: string; price: number | null };
  const mix: Chip[] = [];
  const rt = routes.map((r: any) => ({ userId: r.user_id, name: r.display_name, corridor: r.corridor, price: r.price }));
  const rq = requests.map((s: any) => ({ userId: s.user_id, name: s.display_name, corridor: `${s.corridor} → ${s.recipient_country}`, price: s.price }));
  for (let i = 0; i < Math.max(rt.length, rq.length); i++) { if (rt[i]) mix.push(rt[i]); if (rq[i]) mix.push(rq[i]); }
  const chips = mix.slice(0, 3);

  return (
    <div className="ph-card flex flex-wrap items-center gap-x-4 gap-y-2 p-3 sm:p-4">
      <span className="flex items-center gap-2 font-semibold text-slate-800">
        <LogoMark size={26} />
        {a.avail_title}
      </span>
      <span className="ph-chip bg-orange-50 font-semibold text-orange-700">
        {stats.totalRoutes} {o.chip_routes} · {stats.totalRequests} {o.chip_requests}
      </span>
      <div className="hidden min-w-0 flex-1 items-center gap-2 lg:flex">
        {chips.map((r) => (
          <Link key={r.userId + r.corridor} href={`/login?next=/app/u/${r.userId}`}
            className="inline-flex items-center gap-2 truncate rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:border-orange-300">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-orange-50 text-[9px] font-bold text-orange-700">{chipIni(r.name)}</span>
            <span className="font-semibold text-slate-800">{r.name}</span>
            <span className="text-slate-400">·</span>
            <span className="truncate">{r.corridor}</span>
            <span className="font-semibold text-slate-700">{r.price ? eur(r.price) : o.free}</span>
          </Link>
        ))}
      </div>
      <Link href="/ontdek" className="ph-btn ph-btn-primary ml-auto text-sm">{a.avail_see_all}</Link>
    </div>
  );
}
