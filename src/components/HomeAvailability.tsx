import Link from "next/link";
import { getPublicRoutes, getPublicRequests } from "@/lib/market";
import { Stars } from "@/components/Stars";
import { eur, monthNL } from "@/lib/format";
import type { Messages } from "@/i18n/messages/nl";

function Ini({ name }: { name: string }) {
  const ini = (name || "?").split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  return <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 font-bold text-orange-700">{ini}</div>;
}

type Row = {
  user_id: string; display_name: string; verified: boolean; stars: number | null; stars_n: number;
  corridor: string; price: number | null; kind: "TRAVELER" | "SENDER";
  when: string | null; extra: string;
};

/**
 * Homepage-teaser: wie is er nu (anoniem) beschikbaar, naar welke bestemming.
 * Klik op een persoon → inloggen → diens volledige profiel met reviews + chat.
 * Toont alleen voornaam + initiaal, sterren en een grove periode (privacy).
 */
export async function HomeAvailability({ tenantId, m }: { tenantId: string; m: Messages }) {
  const o = m.ontdek;
  const a = m.home;
  const [routes, requests] = await Promise.all([getPublicRoutes(tenantId, 6), getPublicRequests(tenantId, 6)]);
  if (routes.length === 0 && requests.length === 0) return null;

  const sizeLabel = (code: string) => (o as Record<string, string>)[`size_${code}`] ?? code;
  const rows: Row[] = [];
  routes.forEach((r) =>
    rows.push({
      user_id: r.user_id, display_name: r.display_name, verified: r.verified, stars: r.stars, stars_n: r.stars_n,
      corridor: r.corridor, price: r.price, kind: "TRAVELER",
      when: r.depart_date, extra: sizeLabel(r.package_size),
    })
  );
  requests.forEach((s) =>
    rows.push({
      user_id: s.user_id, display_name: s.display_name, verified: s.verified, stars: s.stars, stars_n: s.stars_n,
      corridor: `${s.corridor} → ${s.recipient_country}`, price: s.price, kind: "SENDER",
      when: s.deadline, extra: s.kg != null ? `± ${s.kg} kg` : "",
    })
  );
  // Reizigers en verzoeken afwisselen; teaser toont maximaal 6.
  const mixed: Row[] = [];
  const travelers = rows.filter((r) => r.kind === "TRAVELER");
  const senders = rows.filter((r) => r.kind === "SENDER");
  for (let i = 0; i < Math.max(travelers.length, senders.length); i++) {
    if (travelers[i]) mixed.push(travelers[i]);
    if (senders[i]) mixed.push(senders[i]);
  }
  const shown = mixed.slice(0, 6);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{a.avail_title}</h2>
          <p className="mt-1 max-w-2xl text-slate-500">{a.avail_sub}</p>
        </div>
        <Link href="/ontdek" className="ph-btn ph-btn-ghost text-sm">{a.avail_see_all}</Link>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((r) => (
          <Link
            key={`${r.kind}-${r.user_id}-${r.corridor}`}
            href={`/login?next=/app/u/${r.user_id}`}
            className="ph-card group block p-4 transition hover:border-orange-300 hover:shadow-sm"
          >
            <div className="flex items-start gap-3">
              <Ini name={r.display_name} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-slate-800">{r.display_name}</span>
                  {r.verified && <span className="text-xs text-orange-600">✓</span>}
                </div>
                <div className="mt-0.5 flex items-center gap-1">
                  <Stars value={r.stars} size={12} /><span className="text-xs text-slate-400">({r.stars_n})</span>
                </div>
                <div className="mt-1 text-sm text-slate-600">{r.corridor}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <span className={`ph-chip text-xs ${r.kind === "TRAVELER" ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-600"}`}>
                {r.kind === "TRAVELER" ? `🧳 ${a.avail_traveler}` : `📦 ${a.avail_request}`}
              </span>
              <span className="text-xs text-slate-500">
                {r.extra}{r.extra && r.when ? " · " : ""}{r.when ? `${o.around} ${monthNL(r.when)}` : ""}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-bold text-slate-800">{r.price ? eur(r.price) : o.free}</span>
              <span className="text-xs font-medium text-orange-600 group-hover:underline">{a.avail_view} →</span>
            </div>
          </Link>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-slate-400">🔒 {a.avail_privacy}</p>
    </section>
  );
}
