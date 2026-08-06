import { getTenantId } from "@/lib/tenant";
import { query } from "@/db/client";
import { dateNL } from "@/lib/format";
import { getLocale, getMessages } from "@/i18n";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trust Center" };

export default async function TrustCenter() {
  const tenantId = await getTenantId();
  const [m, locale] = await Promise.all([getMessages(), getLocale()]);
  const T = m.trust;
  const docs = await query<any>(
    `SELECT slug, kind, title, summary, body, title_i18n, summary_i18n, body_i18n, owner, review_date FROM content_items
      WHERE tenant_id=$1 AND status='PUBLISHED' ORDER BY sort_order`,
    [tenantId]
  );
  const pick = (base: string, i18n: any) => (i18n && i18n[locale]) || base;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <span className="ph-chip bg-orange-50 text-orange-700">{T.badge}</span>
      <h1 className="mt-3 text-3xl font-bold text-slate-900">{T.title}</h1>
      <p className="mt-2 max-w-2xl text-slate-600">{T.intro}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {docs.map((d) => (
          <a key={d.slug} href={`#${d.slug}`} className="ph-chip bg-slate-100 text-slate-600 hover:bg-slate-200">{pick(d.title, d.title_i18n)}</a>
        ))}
      </div>

      <div className="mt-8 space-y-4">
        {docs.map((d) => (
          <section key={d.slug} id={d.slug} className="ph-card scroll-mt-24 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="ph-chip bg-slate-100 text-slate-500">{d.kind}</span>
                <h2 className="mt-2 text-xl font-bold text-slate-900">{pick(d.title, d.title_i18n)}</h2>
              </div>
              <div className="shrink-0 text-right text-xs text-slate-400">
                {d.owner && <div>{T.owner}: {d.owner}</div>}
                {d.review_date && <div>{T.review}: {dateNL(d.review_date)}</div>}
              </div>
            </div>
            {d.summary && <p className="mt-2 font-medium text-slate-700">{pick(d.summary, d.summary_i18n)}</p>}
            <p className="mt-2 text-slate-600">{pick(d.body, d.body_i18n)}</p>
          </section>
        ))}
      </div>

      <div className="mt-10 ph-card bg-slate-50 p-6">
        <h3 className="font-semibold text-slate-900">{T.report_title}</h3>
        <p className="mt-1 text-sm text-slate-600">{T.report_body}</p>
      </div>
    </div>
  );
}
