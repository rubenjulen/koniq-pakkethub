// Insluitbare, publieke "Beschikbaar nu"-widget voor externe sites.
// Volledig zelfstandige HTML (geen site-chrome, geen login) zodat 'm via een
// <iframe> op elke marketing-/landingssite past. Toont geanonimiseerd aanbod.
//   /embed/beschikbaar?theme=light|dark&limit=4&lang=nl|en
import { getTenantId } from "@/lib/tenant";
import { getPublicRoutes, getPublicRequests, getPublicStats } from "@/lib/market";

export const dynamic = "force-dynamic";

const T: Record<string, Record<string, string>> = {
  nl: { title: "Beschikbaar nu", open: "open", routes: "routes", requests: "verzoeken",
        traveler: "Reiziger", request: "Verzoek", free: "Gratis", cta: "Bekijk alles op BugaWuga", none: "Op dit moment geen open aanbod." },
  en: { title: "Available now", open: "open", routes: "routes", requests: "requests",
        traveler: "Traveler", request: "Request", free: "Free", cta: "See everything on BugaWuga", none: "No open listings right now." },
};

function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string
  ));
}
function ini(name: string): string {
  return (name || "?").split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
}
function eur(n: number | null): string {
  return n ? new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n) : "";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const dark = url.searchParams.get("theme") === "dark";
  const lang = (url.searchParams.get("lang") || "nl").toLowerCase();
  const t = T[lang] ?? T.nl;
  const limit = Math.max(1, Math.min(8, parseInt(url.searchParams.get("limit") || "4", 10) || 4));

  const tenantId = await getTenantId();
  const [routes, requests, stats] = await Promise.all([
    getPublicRoutes(tenantId, 8), getPublicRequests(tenantId, 8), getPublicStats(tenantId),
  ]);

  type Row = { userId: string; name: string; verified: boolean; corridor: string; price: number | null; kind: "T" | "S" };
  const rt: Row[] = routes.map((r: any) => ({ userId: r.user_id, name: r.display_name, verified: r.verified, corridor: r.corridor, price: r.price, kind: "T" }));
  const rq: Row[] = requests.map((s: any) => ({ userId: s.user_id, name: s.display_name, verified: s.verified, corridor: `${s.corridor} → ${s.recipient_country}`, price: s.price, kind: "S" }));
  const mixed: Row[] = [];
  for (let i = 0; i < Math.max(rt.length, rq.length); i++) { if (rt[i]) mixed.push(rt[i]); if (rq[i]) mixed.push(rq[i]); }
  const shown = mixed.slice(0, limit);

  // Kleuren (thema-bewust).
  const c = dark
    ? { bg: "#1a1710", card: "#221e16", ink: "#f2eee3", muted: "#a99f8b", line: "#332e22", chip: "#2a2f1e" }
    : { bg: "#ffffff", card: "#fffefb", ink: "#211f18", muted: "#6f695b", line: "#e4dfd1", chip: "#eef4e2" };
  const GREEN = "#6ea82c", GREEN_DEEP = dark ? "#a9d86a" : "#527a1c";
  const site = url.origin;

  const rows = shown.length ? shown.map((r) => `
    <a class="row" href="${esc(site)}/login?next=/app/u/${esc(r.userId)}" target="_blank" rel="noopener" style="text-decoration:none">
      <span class="ini">${esc(ini(r.name))}</span>
      <span class="meta">
        <span class="name">${esc(r.name)}${r.verified ? ' <span class="v">✓</span>' : ""}</span>
        <span class="sub"><span class="tag ${r.kind === "T" ? "tg-t" : "tg-s"}">${r.kind === "T" ? "🧳 " + esc(t.traveler) : "📦 " + esc(t.request)}</span> ${esc(r.corridor)}</span>
      </span>
      <span class="price">${r.price ? esc(eur(r.price)) : esc(t.free)}</span>
    </a>`).join("") : `<p class="empty">${esc(t.none)}</p>`;

  const html = `<!doctype html><html lang="${esc(lang)}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>BugaWuga — ${esc(t.title)}</title>
<style>
  *{box-sizing:border-box}
  html,body{margin:0}
  body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:${c.bg};color:${c.ink};padding:12px}
  .w{max-width:420px;margin:0 auto;background:${c.card};border:1px solid ${c.line};border-radius:16px;overflow:hidden}
  .hd{background:linear-gradient(135deg,${GREEN} 0%,#2b2416 150%);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px}
  .hd svg{width:26px;height:26px;flex:none}
  .hd .tt{font-weight:700;font-size:15px;line-height:1.1}
  .hd .ct{margin-left:auto;font-size:12px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.25);border-radius:999px;padding:3px 9px;white-space:nowrap}
  .list{padding:8px}
  .row{display:flex;align-items:center;gap:10px;padding:9px 8px;border-radius:10px;color:${c.ink}}
  .row:hover{background:${c.chip}}
  .ini{flex:none;width:34px;height:34px;border-radius:9px;background:${c.chip};color:${GREEN_DEEP};font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center}
  .meta{min-width:0;flex:1}
  .name{display:block;font-weight:600;font-size:13px}
  .name .v{color:${GREEN};font-size:11px}
  .sub{display:block;font-size:11px;color:${c.muted};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .tag{display:inline-block;font-size:10px;border-radius:5px;padding:1px 5px;color:${GREEN_DEEP};background:${c.chip}}
  .price{flex:none;font-weight:700;font-size:13px}
  .empty{color:${c.muted};font-size:13px;text-align:center;padding:18px 8px}
  .ft{padding:10px 12px;border-top:1px solid ${c.line}}
  .ft a{display:block;text-align:center;background:${GREEN};color:#fff;font-weight:600;font-size:13px;text-decoration:none;border-radius:10px;padding:9px 12px}
</style></head><body>
  <div class="w">
    <div class="hd">
      <svg viewBox="0 0 64 64" aria-hidden="true"><rect x="3" y="3" width="58" height="58" rx="15" fill="rgba(255,255,255,.16)"/><path fill="#fff" d="M52 21C49 19 48 16 46 15C46 10 48 6 50 7C50 10 49 13 48 14C45 14 43 17 41 20C37 24 33 28 31 34C30 38 31 42 34 44C31 45 28 48 26 52C25 54 27 55 29 53C32 50 35 48 38 47C42 47 46 49 49 51C50 51 50 49 48 48C45 46 43 45 42 42C42 38 43 35 45 33C47 33 49 32 49 35C50 34 50 31 48 30C46 29 46 26 48 25C49 24 51 23 52 21Z"/></svg>
      <span class="tt">BugaWuga · ${esc(t.title)}</span>
      <span class="ct">${stats.totalRoutes} ${esc(t.routes)} · ${stats.totalRequests} ${esc(t.requests)}</span>
    </div>
    <div class="list">${rows}</div>
    <div class="ft"><a href="${esc(site)}/ontdek" target="_blank" rel="noopener">${esc(t.cta)} →</a></div>
  </div>
</body></html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60",
      // Bewust framebaar op externe sites (geen X-Frame-Options).
      "Content-Security-Policy": "frame-ancestors *",
    },
  });
}
