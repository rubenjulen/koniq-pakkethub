import { requireSession, hasCapability } from "@/lib/auth";
import { getLocale } from "@/i18n";
import { getHelp } from "@/content/help";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Handleiding" };

/** Split "Term — uitleg" zodat de term vet wordt. */
function Step({ text }: { text: string }) {
  const i = text.indexOf(" — ");
  if (i === -1) return <span>{text}</span>;
  return (
    <span>
      <b className="font-semibold text-slate-800">{text.slice(0, i)}</b>
      {text.slice(i)}
    </span>
  );
}

export default async function HelpPage() {
  const user = await requireSession();
  const locale = await getLocale();
  const { chrome, guides } = getHelp(locale);
  const pdfHref = `/handleiding/handleiding-${locale === "nl" ? "nl" : "en"}.pdf`;

  // Toon het gemeenschappelijke deel + de gidsen die bij de rechten van deze gebruiker passen.
  const visible = guides.filter((g) => !g.cap || hasCapability(user, g.cap));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">📖 {chrome.title}</h1>
          <p className="text-sm text-slate-500">{chrome.sub}</p>
          <span className="ph-chip mt-2 inline-flex bg-orange-50 text-orange-700">{chrome.for_role}: {user.roleName}</span>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <a href={pdfHref} target="_blank" rel="noopener" data-ev="help_pdf" className="ph-btn ph-btn-primary text-sm">⬇ {chrome.download}</a>
          <PrintButton label={chrome.print} />
        </div>
      </div>

      {visible.map((g) => (
        <section key={g.key} className="ph-card p-5">
          <div className="flex items-baseline gap-2">
            <span className="text-xl" aria-hidden>{g.icon}</span>
            <h2 className="text-lg font-bold text-slate-900">{g.title}</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">{g.intro}</p>

          <div className="mt-4 space-y-5">
            {g.sections.map((s, si) => (
              <div key={si}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-green-800">{s.h}</h3>
                <ul className="mt-2 space-y-2">
                  {s.steps.map((st, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-slate-600">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rotate-45 rounded-[2px] bg-orange-500" aria-hidden />
                      <Step text={st} />
                    </li>
                  ))}
                </ul>
                {s.img && (
                  <img
                    src={`/help/${s.img}.png`}
                    alt={s.h}
                    loading="lazy"
                    className="mt-3 w-full rounded-lg border border-slate-200 shadow-sm"
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      <p className="text-xs text-slate-400">{chrome.tip}</p>
    </div>
  );
}
