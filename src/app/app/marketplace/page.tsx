import Link from "next/link";
import { requireSession, hasCapability } from "@/lib/auth";
import { getMessages } from "@/i18n";
import { EmptyState, Chip } from "@/components/ui";
import { eur, dateNL } from "@/lib/format";
import { Stars } from "@/components/Stars";
import { AdSlot } from "@/components/AdSlot";
import { getRoutes, getRequests } from "@/lib/market";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marktplaats" };

function Avatar({ name, url, size = 44 }: { name: string; url?: string | null; size?: number }) {
  if (url) return <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-xl object-cover" style={{ width: size, height: size }} />;
  const initials = (name || "?").split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  return <div className="flex shrink-0 items-center justify-center rounded-xl bg-orange-100 font-bold text-orange-700" style={{ width: size, height: size, fontSize: size * 0.34 }}>{initials}</div>;
}

type SP = { mode?: string; from?: string; to?: string; verified?: string; priceMax?: string; size?: string; weightMax?: string };

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireSession();
  const m = await getMessages();
  const t = m.mkt2;
  const sp = await searchParams;
  const mode = sp.mode === "requests" ? "requests" : "routes";
  const canBid = hasCapability(user, "offer.create");

  const priceMax = sp.priceMax ? parseFloat(sp.priceMax) : null;
  const weightMax = sp.weightMax ? parseFloat(sp.weightMax) : null;
  const verified = sp.verified === "1";

  const routes = mode === "routes" ? await getRoutes(user.tenantId, { from: sp.from, to: sp.to, verified, priceMax, size: sp.size }) : [];
  const requests = mode === "requests" ? await getRequests(user.tenantId, { from: sp.from, to: sp.to, verified, priceMax, weightMax }) : [];

  const inp = "mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm";
  const tab = (k: string, label: string) => (
    <Link href={`/app/marketplace?mode=${k}`} className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold ${mode === k ? "bg-orange-600 text-white shadow" : "bg-slate-100 text-slate-600"}`}>
      {label}
    </Link>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-slate-900">{t.title}</h1>
        <Link href={mode === "routes" ? "/app/trips" : "/app/shipments"} className="ph-btn ph-btn-ghost text-sm">
          {mode === "routes" ? t.publish_route : t.publish_request}
        </Link>
      </div>

      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {tab("routes", t.tab_routes)}
        {tab("requests", t.tab_requests)}
      </div>
      <p className="text-sm text-slate-500">{mode === "routes" ? t.sub_routes : t.sub_requests}</p>

      <div className="grid gap-5 md:grid-cols-[220px_1fr]">
        {/* Filters */}
        <form className="ph-card h-max space-y-3 p-4 text-sm">
          <input type="hidden" name="mode" value={mode} />
          <div className="font-semibold text-slate-800">{t.filters}</div>
          <label className="block"><span className="text-xs text-slate-500">{t.f_from}</span><input name="from" defaultValue={sp.from ?? ""} className={inp} /></label>
          <label className="block"><span className="text-xs text-slate-500">{t.f_to}</span><input name="to" defaultValue={sp.to ?? ""} className={inp} /></label>
          <label className="flex items-center gap-2"><input type="checkbox" name="verified" value="1" defaultChecked={verified} /> {t.f_verified}</label>
          <label className="block"><span className="text-xs text-slate-500">{t.f_price_max}</span><input name="priceMax" type="number" min="0" defaultValue={sp.priceMax ?? ""} className={inp} /></label>
          {mode === "routes" ? (
            <label className="block"><span className="text-xs text-slate-500">{t.f_size}</span>
              <select name="size" defaultValue={sp.size ?? ""} className={inp}>
                <option value="">{t.any}</option>
                <option value="SMALL">{t.size_SMALL}</option><option value="MEDIUM">{t.size_MEDIUM}</option>
                <option value="LARGE">{t.size_LARGE}</option><option value="XLARGE">{t.size_XLARGE}</option>
              </select>
            </label>
          ) : (
            <label className="block"><span className="text-xs text-slate-500">{t.f_weight_max}</span><input name="weightMax" type="number" min="0" step="0.5" defaultValue={sp.weightMax ?? ""} className={inp} /></label>
          )}
          <div className="flex gap-2">
            <button className="ph-btn ph-btn-primary flex-1 text-sm">{t.f_apply}</button>
            <Link href={`/app/marketplace?mode=${mode}`} className="ph-btn ph-btn-ghost text-sm">{t.f_clear}</Link>
          </div>
        </form>

        {/* Resultaten */}
        <div className="space-y-3">
          <AdSlot tenantId={user.tenantId} placement="MARKETPLACE" label={m.ads.label} />
          {mode === "routes" ? (
            routes.length === 0 ? <EmptyState icon="🧳" title={t.none_routes} /> :
            routes.map((r) => (
              <div key={r.id} className="ph-card flex gap-4 p-4">
                <Avatar name={r.name} url={r.avatar_url} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-800">{r.name}</span>
                    {r.verified && <span className="text-xs text-orange-600">✓</span>}
                    <Stars value={r.stars} size={13} /><span className="text-xs text-slate-400">({r.stars_n})</span>
                  </div>
                  <div className="text-sm text-slate-600">{r.corridor} · {r.city ?? ""}</div>
                  {r.short_info && <p className="mt-1 text-sm text-slate-500">{r.short_info}</p>}
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                    <Chip>{(t as Record<string, string>)[`size_${r.package_size}`] ?? r.package_size}</Chip>
                    <span>{r.capacity ?? "?"} kg</span>
                    <span>{t.depart} {dateNL(r.depart_date)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    <Link href={`/app/u/${r.user_id}`} className="font-medium text-orange-600 hover:underline">{t.see_profile}</Link>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs text-slate-400">{t.service_price}</div>
                  <div className="font-bold text-slate-800">{r.price ? eur(r.price) : t.free}</div>
                </div>
              </div>
            ))
          ) : (
            requests.length === 0 ? <EmptyState icon="📦" title={t.none_requests} /> :
            requests.map((s) => (
              <div key={s.id} className="ph-card flex gap-4 p-4">
                <Avatar name={s.name} url={s.avatar_url} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-800">{s.name}</span>
                    {s.verified && <span className="text-xs text-orange-600">✓</span>}
                    <Stars value={s.stars} size={13} /><span className="text-xs text-slate-400">({s.stars_n})</span>
                  </div>
                  <div className="text-sm text-slate-600">{s.corridor} · → {s.recipient_city}, {s.recipient_country}</div>
                  {s.request_info && <p className="mt-1 text-sm text-slate-500">{s.request_info}</p>}
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>{s.kg ?? "?"} kg</span>
                    <span>{t.deadline} {dateNL(s.deadline)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    <Link href={`/app/u/${s.user_id}`} className="font-medium text-orange-600 hover:underline">{t.see_profile}</Link>
                    {canBid && <Link href={`/app/marketplace/${s.id}`} className="font-medium text-orange-600 hover:underline">{t.react}</Link>}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs text-slate-400">{t.willing_pay}</div>
                  <div className="font-bold text-slate-800">{s.price ? eur(s.price) : t.free}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
