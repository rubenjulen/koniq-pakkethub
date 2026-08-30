// Insluitbare, publieke "Beschikbaar nu"-widget voor externe sites.
// Volledig zelfstandige HTML (geen site-chrome, geen login) zodat 'm via een
// <iframe> op elke marketing-/landingssite past. Toont geanonimiseerd aanbod.
//   /embed/beschikbaar?variant=card|strip|badge&theme=light|dark&limit=4&lang=nl|en
import { getTenantId } from "@/lib/tenant";
import { getPublicRoutes, getPublicRequests, getPublicStats } from "@/lib/market";

export const dynamic = "force-dynamic";

const T: Record<string, Record<string, string>> = {
  nl: { title: "Beschikbaar nu", routes: "routes", requests: "verzoeken", open: "open →",
        traveler: "Reiziger", request: "Verzoek", free: "Gratis", cta: "Bekijk alles op BugaWuga", view: "Bekijk", none: "Op dit moment geen open aanbod." },
  en: { title: "Available now", routes: "routes", requests: "requests", open: "open →",
        traveler: "Traveler", request: "Request", free: "Free", cta: "See everything on BugaWuga", view: "View", none: "No open listings right now." },
};

function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (ch) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] as string
  ));
}
const ini = (name: string) => (name || "?").split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
const eur = (n: number | null) => (n ? new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n) : "");

const ROO = `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="3" y="3" width="58" height="58" rx="15" fill="rgba(255,255,255,.16)"/><path fill="#fff" d="M52 21C49 19 48 16 46 15C46 10 48 6 50 7C50 10 49 13 48 14C45 14 43 17 41 20C37 24 33 28 31 34C30 38 31 42 34 44C31 45 28 48 26 52C25 54 27 55 29 53C32 50 35 48 38 47C42 47 46 49 49 51C50 51 50 49 48 48C45 46 43 45 42 42C42 38 43 35 45 33C47 33 49 32 49 35C50 34 50 31 48 30C46 29 46 26 48 25C49 24 51 23 52 21Z"/></svg>`;

type Row = { userId: string; name: string; verified: boolean; corridor: string; price: number | null; kind: "T" | "S" };

function doc(lang: string, title: string, css: string, body: string) {
  return `<!doctype html><html lang="${esc(lang)}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>BugaWuga — ${esc(title)}</title>
<style>*{box-sizing:border-box}html,body{margin:0}body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}${css}</style>
</head><body>${body}</body></html>`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const variant = (url.searchParams.get("variant") || "card").toLowerCase();
  const dark = url.searchParams.get("theme") === "dark";
  const lang = (url.searchParams.get("lang") || "nl").toLowerCase();
  const t = T[lang] ?? T.nl;
  const limit = Math.max(1, Math.min(8, parseInt(url.searchParams.get("limit") || "4", 10) || 4));

  const tenantId = await getTenantId();
  const [routes, requests, stats] = await Promise.all([
    getPublicRoutes(tenantId, 8), getPublicRequests(tenantId, 8), getPublicStats(tenantId),
  ]);
  const rt: Row[] = routes.map((r: any) => ({ userId: r.user_id, name: r.display_name, verified: r.verified, corridor: r.corridor, price: r.price, kind: "T" }));
  const rq: Row[] = requests.map((s: any) => ({ userId: s.user_id, name: s.display_name, verified: s.verified, corridor: `${s.corridor} → ${s.recipient_country}`, price: s.price, kind: "S" }));
  const mixed: Row[] = [];
  for (let i = 0; i < Math.max(rt.length, rq.length); i++) { if (rt[i]) mixed.push(rt[i]); if (rq[i]) mixed.push(rq[i]); }

  const c = dark
    ? { bg: "#1a1710", card: "#221e16", ink: "#f2eee3", muted: "#a99f8b", line: "#332e22", chip: "#2a2f1e" }
    : { bg: "#ffffff", card: "#fffefb", ink: "#211f18", muted: "#6f695b", line: "#e4dfd1", chip: "#eef4e2" };
  const GREEN = "#6ea82c", GREEN_DEEP = dark ? "#a9d86a" : "#527a1c";
  const site = url.origin;
  const profile = (r: Row) => `${esc(site)}/login?next=/app/u/${esc(r.userId)}`;
  const countTxt = `${stats.totalRoutes} ${esc(t.routes)} · ${stats.totalRequests} ${esc(t.requests)}`;

  let html: string;

  // ---- BADGE: mini-teller (klein pill-knopje) -----------------------------
  if (variant === "badge") {
    const css = `
      body{background:transparent;padding:4px}
      .badge{display:inline-flex;align-items:center;gap:9px;text-decoration:none;
        background:${c.card};color:${c.ink};border:1px solid ${c.line};border-radius:999px;
        padding:7px 14px 7px 9px;font-size:13px;font-weight:600;box-shadow:0 1px 3px rgba(43,36,22,.08)}
      .badge:hover{border-color:${GREEN}}
      .badge .roo{width:26px;height:26px;border-radius:8px;background:${GREEN};display:inline-flex}
      .badge .roo svg{width:26px;height:26px}
      .badge .roo rect{fill:transparent}
      .badge b{color:${GREEN_DEEP}}
      .badge .go{color:${GREEN_DEEP}}`;
    html = doc(lang, t.title, css, `
      <a class="badge" href="${esc(site)}/ontdek" target="_blank" rel="noopener">
        <span class="roo">${ROO}</span>
        <span><b>${stats.totalRoutes}</b> ${esc(t.routes)} · <b>${stats.totalRequests}</b> ${esc(t.requests)}</span>
        <span class="go">${esc(t.open)}</span>
      </a>`);

  // ---- STRIP: horizontale balk (bijv. site-brede banner) ------------------
  } else if (variant === "strip") {
    const chips = mixed.slice(0, 3).map((r) => `
      <a class="chip" href="${profile(r)}" target="_blank" rel="noopener">
        <span class="ci">${esc(ini(r.name))}</span>
        <span class="cn">${esc(r.name)}</span>
        <span class="cc">${esc(r.corridor)}</span>
        <span class="cp">${r.price ? esc(eur(r.price)) : esc(t.free)}</span>
      </a>`).join("");
    const css = `
      body{background:${c.bg};padding:8px}
      .strip{display:flex;align-items:center;gap:14px;flex-wrap:wrap;
        background:${c.card};border:1px solid ${c.line};border-radius:14px;padding:10px 14px}
      .brand{display:flex;align-items:center;gap:9px;font-weight:700;font-size:14px;color:${c.ink};white-space:nowrap}
      .brand .roo{width:28px;height:28px;background:linear-gradient(135deg,${GREEN},#2b2416 160%);border-radius:8px;display:inline-flex}
      .brand .roo svg{width:28px;height:28px}
      .count{font-size:12px;color:${GREEN_DEEP};font-weight:700;background:${c.chip};border-radius:999px;padding:4px 10px;white-space:nowrap}
      .chips{display:flex;gap:8px;flex:1;min-width:0;overflow:hidden}
      .chip{display:inline-flex;align-items:center;gap:7px;text-decoration:none;color:${c.ink};
        background:${c.bg};border:1px solid ${c.line};border-radius:10px;padding:5px 9px;font-size:12px;white-space:nowrap}
      .chip:hover{border-color:${GREEN}}
      .chip .ci{width:22px;height:22px;border-radius:6px;background:${c.chip};color:${GREEN_DEEP};font-weight:700;font-size:9px;display:flex;align-items:center;justify-content:center}
      .chip .cn{font-weight:600}
      .chip .cc{color:${c.muted}}
      .chip .cp{font-weight:700}
      .cta{margin-left:auto;text-decoration:none;background:${GREEN};color:#fff;font-weight:600;font-size:13px;border-radius:10px;padding:8px 14px;white-space:nowrap}
      @media(max-width:560px){.chips{display:none}.cta{margin-left:0}}`;
    html = doc(lang, t.title, css, `
      <div class="strip">
        <span class="brand"><span class="roo">${ROO}</span>${esc(t.title)}</span>
        <span class="count">${countTxt}</span>
        <span class="chips">${chips}</span>
        <a class="cta" href="${esc(site)}/ontdek" target="_blank" rel="noopener">${esc(t.view)} →</a>
      </div>`);

  // ---- CARD (standaard): volledige lijst ----------------------------------
  } else {
    const shown = mixed.slice(0, limit);
    const rows = shown.length ? shown.map((r) => `
      <a class="row" href="${profile(r)}" target="_blank" rel="noopener">
        <span class="ini">${esc(ini(r.name))}</span>
        <span class="meta">
          <span class="name">${esc(r.name)}${r.verified ? ' <span class="v">✓</span>' : ""}</span>
          <span class="sub"><span class="tag">${r.kind === "T" ? "🧳 " + esc(t.traveler) : "📦 " + esc(t.request)}</span> ${esc(r.corridor)}</span>
        </span>
        <span class="price">${r.price ? esc(eur(r.price)) : esc(t.free)}</span>
      </a>`).join("") : `<p class="empty">${esc(t.none)}</p>`;
    const css = `
      body{background:${c.bg};color:${c.ink};padding:12px}
      .w{max-width:420px;margin:0 auto;background:${c.card};border:1px solid ${c.line};border-radius:16px;overflow:hidden}
      .hd{background:linear-gradient(135deg,${GREEN} 0%,#2b2416 150%);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px}
      .hd svg{width:26px;height:26px;flex:none}
      .hd .tt{font-weight:700;font-size:15px;line-height:1.1}
      .hd .ct{margin-left:auto;font-size:12px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.25);border-radius:999px;padding:3px 9px;white-space:nowrap}
      .list{padding:8px}
      .row{display:flex;align-items:center;gap:10px;padding:9px 8px;border-radius:10px;color:${c.ink};text-decoration:none}
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
      .ft a{display:block;text-align:center;background:${GREEN};color:#fff;font-weight:600;font-size:13px;text-decoration:none;border-radius:10px;padding:9px 12px}`;
    html = doc(lang, t.title, css, `
      <div class="w">
        <div class="hd">${ROO}<span class="tt">BugaWuga · ${esc(t.title)}</span><span class="ct">${countTxt}</span></div>
        <div class="list">${rows}</div>
        <div class="ft"><a href="${esc(site)}/ontdek" target="_blank" rel="noopener">${esc(t.cta)} →</a></div>
      </div>`);
  }

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60",
      "Content-Security-Policy": "frame-ancestors *",
    },
  });
}
