import { requireCapability } from "@/lib/auth";
import { query } from "@/db/client";
import { Chip, SectionTitle, EmptyState } from "@/components/ui";
import { addVideoAction, toggleVideoAction, updateVideoAction, deleteVideoAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Content & video's" };

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await requireCapability("control.view");
  const sp = await searchParams;
  const inp = "rounded-lg border border-slate-300 px-2 py-1.5 text-sm";

  const videos = await query<any>(
    `SELECT id, slug, title, body AS yt, status, sort_order FROM content_items
      WHERE tenant_id=$1 AND kind='VIDEO' ORDER BY sort_order`, [user.tenantId]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">🎬 Content & video&apos;s</h1>
        <p className="text-sm text-slate-500">Beheer de video&apos;s op de publieke site (YouTube). Gepubliceerde video&apos;s verschijnen op de homepage.</p>
      </div>
      {sp.ok && <div className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700 ring-1 ring-orange-200">Bijgewerkt.</div>}
      {sp.error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">Titel en YouTube-ID/URL zijn verplicht.</div>}

      <section className="ph-card p-5">
        <SectionTitle sub="Plak een YouTube-URL of -ID; de rest wordt afgeleid">Video toevoegen</SectionTitle>
        <form action={addVideoAction} className="grid gap-2 sm:grid-cols-2">
          <input name="title" placeholder="Titel" className={inp} />
          <input name="youtube" placeholder="YouTube-URL of -ID" className={inp} />
          <input name="sort_order" type="number" defaultValue={100} className={`${inp} w-28`} title="Volgorde" />
          <div className="sm:col-span-2"><button className="ph-btn ph-btn-primary text-sm">+ Video toevoegen</button></div>
        </form>
      </section>

      <section>
        <SectionTitle>Video&apos;s ({videos.length})</SectionTitle>
        {videos.length === 0 ? <EmptyState icon="🎬" title="Nog geen video's" /> : (
          <div className="mt-2 space-y-3">
            {videos.map((v) => (
              <div key={v.id} className="ph-card p-3">
                <div className="flex gap-3">
                  <img
                    src={`https://i.ytimg.com/vi/${v.yt}/mqdefault.jpg`}
                    alt="" width={120} height={68}
                    className="h-[68px] w-[120px] shrink-0 rounded-lg bg-slate-100 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-slate-800">{v.title}</span>
                      <Chip tone={v.status === "PUBLISHED" ? "ok" : "neutral"}>{v.status}</Chip>
                    </div>
                    <div className="font-mono text-xs text-slate-400">{v.yt}</div>
                    <form action={updateVideoAction} className="mt-2 flex flex-wrap items-center gap-1.5">
                      <input type="hidden" name="id" value={v.id} />
                      <input name="title" defaultValue={v.title} className={`${inp} flex-1`} />
                      <input name="youtube" defaultValue={v.yt} className={`${inp} w-40`} />
                      <input name="sort_order" type="number" defaultValue={v.sort_order} className={`${inp} w-20`} />
                      <button className="ph-btn ph-btn-ghost text-xs">Opslaan</button>
                    </form>
                    <div className="mt-1 flex gap-3 text-xs">
                      <form action={toggleVideoAction}><input type="hidden" name="id" value={v.id} /><button className="text-orange-600 hover:underline">{v.status === "PUBLISHED" ? "Depubliceren" : "Publiceren"}</button></form>
                      <form action={deleteVideoAction}><input type="hidden" name="id" value={v.id} /><button className="text-rose-500 hover:underline">Verwijderen</button></form>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
