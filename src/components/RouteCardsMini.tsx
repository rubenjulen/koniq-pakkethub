import { getRoutes } from "@/lib/market";
import { Stars } from "@/components/Stars";
import { dateNL } from "@/lib/format";

function MiniAvatar({ name, url }: { name: string; url?: string | null }) {
  if (url) return <img src={url} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-lg object-cover" />;
  const initials = (name || "?").split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  return <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-xs font-bold text-white">{initials}</div>;
}

/** Compacte lijst met zichtbare routes — voor de login/register-schermen. */
export async function RouteCardsMini({ tenantId, departsLabel, limit = 5 }: { tenantId: string; departsLabel: string; limit?: number }) {
  const routes = (await getRoutes(tenantId, {})).slice(0, limit);
  if (routes.length === 0) return null;
  return (
    <div className="space-y-2">
      {routes.map((r) => (
        <div key={r.id} className="flex items-center gap-3 rounded-xl bg-white/10 p-2.5 ring-1 ring-white/10">
          <MiniAvatar name={r.name} url={r.avatar_url} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-white">{r.name}</span>
              {r.verified && <span className="text-[11px] text-orange-300">✓</span>}
              <Stars value={r.stars} size={11} />
            </div>
            <div className="truncate text-xs text-white/70">{r.short_info ?? r.corridor}</div>
          </div>
          <div className="shrink-0 text-right text-[11px] text-white/60">
            {departsLabel}<br /><span className="text-white/80">{dateNL(r.depart_date)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
