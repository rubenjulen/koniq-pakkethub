import { getPublicRoutes } from "@/lib/market";
import { Stars } from "@/components/Stars";
import { monthNL } from "@/lib/format";

function MiniAvatar({ name }: { name: string }) {
  const ini = (name || "?").split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  return <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-xs font-bold text-white">{ini}</div>;
}

/**
 * Compacte lijst met publieke, GEANONIMISEERDE routes — voor login/register.
 * Toont voornaam + initiaal en een grove periode (maand), nooit exacte datum,
 * achternaam, avatarfoto of contactgegevens.
 */
export async function RouteCardsMini({ tenantId, departsLabel, limit = 5 }: { tenantId: string; departsLabel: string; limit?: number }) {
  const routes = (await getPublicRoutes(tenantId, limit)).slice(0, limit);
  if (routes.length === 0) return null;
  return (
    <div className="space-y-2">
      {routes.map((r) => (
        <div key={r.id} className="flex items-center gap-3 rounded-xl bg-white/10 p-2.5 ring-1 ring-white/10">
          <MiniAvatar name={r.display_name} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-white">{r.display_name}</span>
              {r.verified && <span className="text-[11px] text-orange-300">✓</span>}
              <Stars value={r.stars} size={11} />
            </div>
            <div className="truncate text-xs text-white/70">{r.short_info ?? r.corridor}</div>
          </div>
          <div className="shrink-0 text-right text-[11px] text-white/60">
            {departsLabel}<br /><span className="text-white/80">{monthNL(r.depart_date)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
