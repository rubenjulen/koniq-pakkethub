import Link from "next/link";
import { InstallAppButton } from "@/components/InstallAppButton";
import { AirportHero } from "@/components/AirportHero";
import { HeroVideo } from "@/components/HeroVideo";
import { VideoEmbed } from "@/components/VideoEmbed";
import { getMessages } from "@/i18n";

const VIDEO_IDS = ["O_RucR2okRY", "z2wXH9ZCQSM"] as const;

export default async function HomePage() {
  const m = await getMessages();
  const h = m.home;

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
  const STEPS = [h.step1, h.step2, h.step3, h.step4, h.step5];

  return (
    <>
      {/* Hero met full-bleed achtergrondvideo (luchthaven-illustratie als fallback eronder) */}
      <section className="relative flex min-h-[88vh] w-full items-center overflow-hidden bg-[#2e2e2e] text-white">
        <AirportHero className="absolute inset-0 h-full w-full" />
        <HeroVideo src="/media/hero.mp4" poster="/media/hero-poster.jpg" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/85 to-[#141414]/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414]/80 via-transparent to-[#141414]/40" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-8 px-4 py-20 lg:grid-cols-2 lg:items-center">
          <div className="[text-shadow:0_1px_16px_rgba(0,0,0,0.6)]">
            <span className="ph-chip bg-orange-600 text-white shadow-lg [text-shadow:none]">{h.pilot_badge}</span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight text-white sm:text-5xl">
              {h.hero_a} <span className="text-orange-400">{h.hero_highlight}</span> {h.hero_b}
            </h1>
            <p className="mt-4 max-w-lg text-lg font-medium text-slate-100">{h.hero_sub}</p>
            <div className="mt-6 flex flex-wrap gap-3 [text-shadow:none]">
              <Link href="/verzenden" className="ph-btn ph-btn-primary shadow-lg">{m.common.send_package}</Link>
              <Link href="/hoe-het-werkt" className="ph-btn bg-white/15 text-white ring-1 ring-white/25 backdrop-blur hover:bg-white/25">{m.common.how_it_works}</Link>
            </div>
            <div className="mt-6 [text-shadow:none]"><InstallAppButton label={h.install_app} /></div>
          </div>
          <div className="hidden lg:block">
            <div className="rounded-2xl border border-white/10 bg-[#1c1c1c]/85 p-6 text-sm text-slate-100 shadow-2xl backdrop-blur-md">
              <div className="mb-4 flex items-center gap-2 font-semibold text-white">
                <span className="h-2 w-2 rounded-full bg-orange-500" /> {h.how_shipment_works}
              </div>
              <ol className="space-y-3">
                {STEPS.map((t, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">{i + 1}</span>
                    <span className="leading-relaxed">{t}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
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
            {VIDEO_IDS.map((id) => <VideoEmbed key={id} id={id} title={h.videos_title} />)}
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
        <div className="ph-card flex flex-col items-center gap-4 bg-gradient-to-br from-orange-600 to-slate-800 p-10 text-center text-white">
          <h2 className="text-2xl font-bold">{h.cta_title}</h2>
          <p className="max-w-lg text-orange-50">{h.cta_sub}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/verzenden" className="ph-btn bg-white text-slate-900 hover:bg-slate-100">{h.cta_check}</Link>
            <Link href="/partner" className="ph-btn bg-white/15 text-white hover:bg-white/25">{h.cta_partner}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
