import Link from "next/link";
import { Stars } from "@/components/Stars";
import { eur, monthNL } from "@/lib/format";
import type { Messages } from "@/i18n/messages/nl";

function Ini({ name }: { name: string }) {
  const ini = (name || "?").split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-sm font-bold text-orange-700">{ini}</div>;
}

type PubRow = {
  user_id: string; display_name: string; verified: boolean; stars: number | null; stars_n: number;
  corridor: string; price: number | null; package_size?: string; recipient_country?: string;
  depart_date?: string | null; deadline?: string | null; kg?: number | null;
};
type Row = {
  user_id: string; display_name: string; verified: boolean; stars: number | null; stars_n: number;
  corridor: string; price: number | null; kind: "TRAVELER" | "SENDER"; when: string | null; extra: string;
};

/**
 * Homepage-teaser: wie is er nu (anoniem) beschikbaar, naar welke bestemming.
 * Klik op een persoon → inloggen → diens volledige profiel met reviews + chat.
 * Prop-gestuurd (geen eigen fetch); toont alleen voornaam + initiaal + grove periode.
 */
export function HomeAvailability({ routes, requests, m, max = 5 }: {
  routes: PubRow[]; requests: PubRow[]; m: Messages; max?: number;
}) {
  const o = m.ontdek;
  const a = m.home;
  if (routes.length === 0 && requests.length === 0) return null;

  const sizeLabel = (code?: string) => (code ? (o as Record<string, string>)[`size_${code}`] ?? code : "");
  const travelers: Row[] = routes.map((r) => ({
    user_id: r.user_id, display_name: r.display_name, verified: r.verified, stars: r.stars, stars_n: r.stars_n,
    corridor: r.corridor, price: r.price, kind: "TRAVELER", when: r.depart_date ?? null, extra: sizeLabel(r.package_size),
  }));
  const senders: Row[] = requests.map((s) => ({
    user_id: s.user_id, display_name: s.display_name, verified: s.verified, stars: s.stars, stars_n: s.stars_n,
    corridor: `${s.corridor} → ${s.recipient_country}`, price: s.price, kind: "SENDER",
    when: s.deadline ?? null, extra: s.kg != null ? `± ${s.kg} kg` : "",
  }));
  // Reizigers en verzoeken afwisselen.
  const mixed: Row[] = [];
  for (let i = 0; i < Math.max(travelers.length, senders.length); i++) {
    if (travelers[i]) mixed.push(travelers[i]);
    if (senders[i]) mixed.push(senders[i]);
  }
  const shown = mixed.slice(0, max);

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{a.avail_title}</h2>
          <p className="mt-1 text-sm text-slate-500">{a.avail_sub}</p>
        </div>
        <Link href="/ontdek" className="shrink-0 text-sm font-medium text-orange-600 hover:underline">{a.avail_see_all}</Link>
      </div>

      <div className="mt-4 space-y-2.5">
        {shown.map((r) => (
          <Link
            key={`${r.kind}-${r.user_id}-${r.corridor}`}
            href={`/login?next=/app/u/${r.user_id}`}
            data-ev="avail_card"
            className="ph-card group flex items-center gap-3 p-3 transition hover:border-orange-300 hover:shadow-sm"
          >
            <Ini name={r.display_name} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <span className="font-semibold text-slate-800">{r.display_name}</span>
                {r.verified && <span className="text-xs text-orange-600">✓</span>}
                <Stars value={r.stars} size={11} /><span className="text-xs text-slate-400">({r.stars_n})</span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
                <span className={`ph-chip ${r.kind === "TRAVELER" ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-600"}`}>
                  {r.kind === "TRAVELER" ? `🧳 ${a.avail_traveler}` : `📦 ${a.avail_request}`}
                </span>
                <span className="truncate">{r.corridor}</span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-bold text-slate-800">{r.price ? eur(r.price) : o.free}</div>
              <div className="text-[11px] text-slate-400">{r.when ? monthNL(r.when) : r.extra}</div>
            </div>
          </Link>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-400">🔒 {a.avail_privacy}</p>
    </div>
  );
}
