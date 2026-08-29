import { requireCapability } from "@/lib/auth";
import { query } from "@/db/client";
import { Chip, SectionTitle, EmptyState } from "@/components/ui";
import { getMessages } from "@/i18n";
import { createAdAction, toggleAdAction, deleteAdAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Advertenties" };

export default async function AdsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await requireCapability("control.view");
  const t = (await getMessages()).ads;
  const sp = await searchParams;
  const inp = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

  const ads = await query<any>(
    `SELECT id, advertiser, title, body, link_url, icon, placement, active, impressions
       FROM ads WHERE tenant_id=$1 ORDER BY created_at DESC`, [user.tenantId]);
  const PM: Record<string, string> = { MARKETPLACE: t.pm_marketplace, HOME: t.pm_home, SIDEBAR: t.pm_sidebar };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">📣 {t.title}</h1>
        <p className="text-sm text-slate-500">{t.sub}</p>
      </div>
      {sp.ok && <div className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700 ring-1 ring-orange-200">✓</div>}
      {sp.error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">—</div>}

      <section className="ph-card p-4">
        <SectionTitle>{t.new}</SectionTitle>
        <form action={createAdAction} className="grid gap-2 sm:grid-cols-2">
          <label className="block text-sm">{t.advertiser}<input name="advertiser" required className={inp} /></label>
          <label className="block text-sm">{t.ad_title}<input name="title" required className={inp} /></label>
          <label className="block text-sm sm:col-span-2">{t.body}<input name="body" className={inp} /></label>
          <label className="block text-sm">{t.link}<input name="link_url" placeholder="https://…" className={inp} /></label>
          <label className="block text-sm">{t.icon}<input name="icon" placeholder="✈️" maxLength={4} className={inp} /></label>
          <label className="block text-sm">{t.placement}
            <select name="placement" className={inp}>
              <option value="MARKETPLACE">{t.pm_marketplace}</option>
              <option value="HOME">{t.pm_home}</option>
              <option value="SIDEBAR">{t.pm_sidebar}</option>
            </select>
          </label>
          <div className="flex items-end"><button className="ph-btn ph-btn-primary text-sm">{t.add}</button></div>
        </form>
      </section>

      <section>
        <SectionTitle>{t.list} ({ads.length})</SectionTitle>
        {ads.length === 0 ? <EmptyState icon="📣" title="—" /> : (
          <div className="ph-card mt-2 divide-y divide-slate-100">
            {ads.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-lg ring-1 ring-amber-200">{a.icon ?? "📣"}</div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-800">{a.title} <span className="text-xs text-slate-400">· {a.advertiser}</span></div>
                    <div className="text-xs text-slate-500">{PM[a.placement] ?? a.placement} · {a.impressions} {t.impressions}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Chip tone={a.active ? "ok" : "neutral"}>{a.active ? t.active : t.inactive}</Chip>
                  <form action={toggleAdAction}><input type="hidden" name="id" value={a.id} /><button className="text-orange-600 hover:underline">{a.active ? t.deactivate : t.activate}</button></form>
                  <form action={deleteAdAction}><input type="hidden" name="id" value={a.id} /><button className="text-rose-500 hover:underline">{t.del}</button></form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
