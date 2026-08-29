import { query } from "@/db/client";

/** Toont één actieve B2B-advertentie voor een plaatsing. Sponsored, duidelijk gelabeld. */
export async function AdSlot({ tenantId, placement, label }: { tenantId: string; placement: string; label: string }) {
  const ads = await query<any>(
    `SELECT id, advertiser, title, body, link_url, icon FROM ads
      WHERE tenant_id=$1 AND placement=$2 AND active=true ORDER BY impressions ASC, created_at DESC LIMIT 1`,
    [tenantId, placement]
  );
  const ad = ads[0];
  if (!ad) return null;
  return (
    <a href={ad.link_url || "#"} target="_blank" rel="noopener noreferrer nofollow"
      className="block rounded-xl border border-amber-200 bg-amber-50/60 p-3 transition hover:border-amber-300">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700/80">{label}</div>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-xl ring-1 ring-amber-200">{ad.icon ?? "📣"}</div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-800">{ad.title}</div>
          <div className="truncate text-xs text-slate-500">{ad.body}</div>
          <div className="text-[11px] font-medium text-amber-700">{ad.advertiser}</div>
        </div>
      </div>
    </a>
  );
}
