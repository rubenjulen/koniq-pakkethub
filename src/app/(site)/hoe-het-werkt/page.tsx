import Link from "next/link";
import { getMessages } from "@/i18n";
import { getTenantId } from "@/lib/tenant";
import { AvailabilityStrip } from "@/components/AvailabilityStrip";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hoe het werkt" };

export default async function HowItWorks() {
  const m = await getMessages();
  const tenantId = await getTenantId();
  const h = m.hiw;

  const PERSONAS: [string, string, string[], string, string][] = [
    ["📦", h.p_sender, [h.ps1, h.ps2, h.ps3, h.ps4], "/verzenden", m.common.send_package],
    ["🧳", h.p_traveler, [h.pt1, h.pt2, h.pt3, h.pt4], "/aanmelden?role=TRAVELER", m.register.cta],
    ["📥", h.p_recipient, [h.pr1, h.pr2, h.pr3, h.pr4], "/track", h.track_cta],
    ["🚚", h.p_partner, [h.pp1, h.pp2, h.pp3, h.pp4], "/partner", m.footer.svc_partner],
  ];
  const STEPS: [string, string][] = [
    [h.s1_t, h.s1_d], [h.s2_t, h.s2_d], [h.s3_t, h.s3_d], [h.s4_t, h.s4_d], [h.s5_t, h.s5_d],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">{h.title}</h1>
      <p className="mt-2 max-w-2xl text-slate-600">{h.intro}</p>

      <div className="mt-6"><AvailabilityStrip tenantId={tenantId} m={m} /></div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PERSONAS.map(([icon, title, points, href, cta]) => (
          <div key={title} className="ph-card flex flex-col p-5">
            <div className="text-3xl">{icon}</div>
            <h3 className="mt-2 font-semibold text-slate-900">{title}</h3>
            <ul className="mt-2 flex-1 space-y-1 text-sm text-slate-500">
              {points.map((p) => <li key={p} className="flex gap-1.5"><span className="text-orange-500">›</span>{p}</li>)}
            </ul>
            <Link href={href} className="ph-btn ph-btn-ghost mt-4 text-sm">{cta}</Link>
          </div>
        ))}
      </div>

      <h2 className="mt-16 text-2xl font-bold text-slate-900">{h.steps_title}</h2>
      <ol className="mt-6 space-y-4">
        {STEPS.map(([t, d], i) => (
          <li key={t} className="ph-card flex gap-4 p-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 font-bold text-white">{i + 1}</span>
            <div>
              <h3 className="font-semibold text-slate-900">{t}</h3>
              <p className="text-sm text-slate-500">{d}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
