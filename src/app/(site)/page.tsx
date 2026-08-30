import Link from "next/link";
import { InstallAppButton } from "@/components/InstallAppButton";
import { BoardingHero } from "@/components/BoardingHero";
import { HeroVideo } from "@/components/HeroVideo";
import { RouteSearch } from "@/components/RouteSearch";
import { VideoEmbed } from "@/components/VideoEmbed";
import { QuoteCalculator } from "@/components/QuoteCalculator";
import { HomeAvailability } from "@/components/HomeAvailability";
import { getMessages, getLocale } from "@/i18n";
import { getTenantId, getCorridors, getCategoriesList } from "@/lib/tenant";
import { getPublicRoutes, getPublicRequests, getPublicStats } from "@/lib/market";
import { query, queryOne } from "@/db/client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const m = await getMessages();
  const locale = await getLocale();
  const h = m.home;

  // Video's uit de content-CMS (content_items kind=VIDEO); fallback op vaste id's.
  const tenantId = await getTenantId();
  // Sociaal bewijs: aantal beschikbare routes (open ritten) + open verzendverzoeken.
  const rc = await queryOne<{ n: number }>(
    `SELECT ((SELECT count(*) FROM trips WHERE tenant_id=$1 AND status='OPEN')
           + (SELECT count(*) FROM shipments WHERE tenant_id=$1 AND status IN ('QUOTED','SCREENING')))::int AS n`,
    [tenantId]
  );
  const routeCount = Math.max(rc?.n ?? 0, 1);
  const vrows = await query<any>(
    `SELECT body AS yt, title, title_i18n FROM content_items
      WHERE tenant_id=$1 AND kind='VIDEO' AND status='PUBLISHED' ORDER BY sort_order`, [tenantId]
  );
  const videos = vrows.length
    ? vrows.map((v) => ({ id: v.yt as string, title: (v.title_i18n?.[locale] as string) || v.title }))
    : [{ id: "O_RucR2okRY", title: h.videos_title }, { id: "z2wXH9ZCQSM", title: h.videos_title }];

  // Gratis check (QuoteCalculator): corridor-limieten + categorieën, zoals /verzenden.
  const corridors = await getCorridors(tenantId);
  const pilot = corridors.find((c) => c.status === "PILOT") ?? corridors[0];
  const categories = (await getCategoriesList(tenantId)).map((c) => ({
    code: c.code, name: c.name, traveler_eligible: c.traveler_eligible, requires_review: c.requires_review,
    prohibited: c.prohibited, dangerous_goods: c.dangerous_goods,
    max_value_eur: c.max_value_eur != null ? parseFloat(String(c.max_value_eur)) : null,
  }));
  // Publiek (anoniem) beschikbaar — voor het "Nu beschikbaar"-blok naast de check.
  const [pubRoutes, pubRequests, pubStats] = await Promise.all([
    getPublicRoutes(tenantId, 6), getPublicRequests(tenantId, 6), getPublicStats(tenantId),
  ]);
  const hasAvail = pubRoutes.length > 0 || pubRequests.length > 0;

  const MODES = [
    ["📦", h.mode1_t, h.mode1_d, "/verzenden"],
    ["🧳", h.mode2_t, h.mode2_d, "/aanmelden?role=TRAVELER"],
    ["🏭", h.mode3_t, h.mode3_d, "/hoe-het-werkt"],
    ["🚚", h.mode4_t, h.mode4_d, "/prijzen"],
  ];
  const SPINE = [
    [h.spine1_t, h.spine1_d], [h.spine2_t, h.spine2_d], [h.spine3_t, h.spine3_d],
    [h.spine4_t, h.spine4_d], [h.spine5_t, h.spine5_d], [h.spine6_t, h.spine6_d],
  ];

  return (
    <>
      {/* Hero: passagiers stappen bij schemering in het vliegtuig + route-zoek */}
      <section className="relative flex min-h-[92vh] w-full items-center overflow-hidden bg-[#2b2416] text-white">
        {/* SVG-boarding-scène als directe fallback; video legt zich erover zodra hij speelt. */}
        <BoardingHero className="absolute inset-0 h-full w-full" />
        <HeroVideo src="/media/hero.mp4" poster="/media/hero-poster.jpg" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1c160e]/95 via-[#1c160e]/55 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1c160e]/70 via-transparent to-transparent" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-8 px-4 py-20 lg:grid-cols-2 lg:items-center">
          <div className="[text-shadow:0_1px_16px_rgba(0,0,0,0.6)]">
            <span className="ph-chip bg-orange-600 text-white shadow-lg [text-shadow:none]">{h.pilot_badge}</span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight text-white sm:text-5xl">
              {h.h2_title}
            </h1>
            <p className="mt-3 text-lg font-semibold text-orange-300">{h.h2_sub.replace("{n}", String(routeCount))}</p>
            <p className="mt-3 max-w-lg text-base text-slate-200">{h.origin_line}</p>
            {(pubStats.totalRoutes + pubStats.totalRequests) > 0 && (
              <Link href="/ontdek" className="mt-5 inline-flex items-center gap-2.5 rounded-full bg-white/12 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/20 [text-shadow:none]">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75 motion-reduce:hidden"></span>
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-400"></span>
                </span>
                <span>🧳 {pubStats.totalRoutes} {m.ontdek.chip_routes}</span>
                <span className="text-white/40">·</span>
                <span>📦 {pubStats.totalRequests} {m.ontdek.chip_requests}</span>
                <span className="font-semibold text-orange-200">{h.live_open}</span>
              </Link>
            )}
            <div className="mt-6 [text-shadow:none]"><InstallAppButton label={h.install_app} /></div>
          </div>
          <div className="[text-shadow:none]">
            <RouteSearch t={h} />
            <p className="mt-3 text-center text-xs text-slate-300">{h.hero_sub}</p>
          </div>
        </div>
      </section>

      {/* Gratis check + Nu beschikbaar — naast elkaar, meteen uitproberen */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className={`grid gap-10 ${hasAvail ? "lg:grid-cols-2 lg:items-start" : ""}`}>
          <div className={hasAvail ? "" : "mx-auto w-full max-w-3xl"}>
            <div className={hasAvail ? "" : "text-center"}>
              <span className="ph-chip bg-orange-50 text-orange-700">{m.send.badge}</span>
              <h2 className="mt-3 text-2xl font-bold text-slate-900">{h.check_title}</h2>
              <p className="mt-1 max-w-xl text-slate-500">{h.check_sub}</p>
            </div>
            <div className="mt-6">
              <QuoteCalculator categories={categories} corridor={{ ...pilot, name: pilot.name }} t={m.send} eligLabels={m.elig} />
            </div>
          </div>
          {hasAvail && <HomeAvailability routes={pubRoutes} requests={pubRequests} m={m} />}
        </div>
      </section>

      {/* Service modes */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-bold text-slate-900">{h.modes_title}</h2>
        <p className="mt-1 text-slate-500">{h.modes_sub}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODES.map(([icon, title, desc, href]) => (
            <Link key={title} href={href} className="ph-card group p-5 transition hover:border-orange-300 hover:shadow-sm">
              <div className="text-3xl">{icon}</div>
              <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-500">{desc}</p>
              <span className="mt-3 inline-block text-sm font-medium text-orange-600 group-hover:underline">{m.common.learn_more} →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Video's */}
      <section className="bg-[#2e2e2e] py-16 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">{h.videos_title}</h2>
              <p className="mt-1 max-w-2xl text-slate-300">{h.videos_sub}</p>
            </div>
            <span className="ph-chip bg-white/10 text-slate-200">{h.videos_privacy}</span>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {videos.map((v) => <VideoEmbed key={v.id} id={v.id} title={v.title} />)}
          </div>
        </div>
      </section>

      {/* Trust spine */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-bold text-slate-900">{h.spine_title}</h2>
          <p className="mt-1 max-w-2xl text-slate-500">{h.spine_sub}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SPINE.map(([title, desc]) => (
              <div key={title} className="ph-card p-5">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-orange-700">✓</span>
                  <h3 className="font-semibold text-slate-900">{title}</h3>
                </div>
                <p className="mt-2 text-sm text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link href="/trust" className="ph-btn ph-btn-ghost">{h.read_trust}</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div
          className="flex flex-col items-center gap-4 rounded-2xl p-10 text-center text-white shadow-sm"
          style={{ background: "linear-gradient(135deg, #6ea82c 0%, #2b2416 100%)" }}
        >
          <h2 className="text-2xl font-bold">{h.cta_title}</h2>
          <p className="max-w-lg text-white/90">{h.cta_sub}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/verzenden" className="ph-btn bg-white text-slate-900 hover:bg-slate-100">{h.cta_check}</Link>
            <Link href="/partner" className="ph-btn bg-white/15 text-white hover:bg-white/25">{h.cta_partner}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
