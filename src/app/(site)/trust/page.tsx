import { getTenantId } from "@/lib/tenant";
import { query } from "@/db/client";
import { dateNL } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trust Center" };

export default async function TrustCenter() {
  const tenantId = await getTenantId();
  const docs = await query<any>(
    `SELECT slug, kind, title, summary, body, owner, review_date FROM content_items
      WHERE tenant_id=$1 AND status='PUBLISHED' ORDER BY sort_order`,
    [tenantId]
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <span className="ph-chip bg-orange-50 text-orange-700">🛡️ Trust Center</span>
      <h1 className="mt-3 text-3xl font-bold text-slate-900">Veiligheid en beleid, transparant</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Hoe we verifiëren, wat wel en niet mag, hoe betalingen en douane werken, en hoe je een zorg meldt.
        Beleid alleen is niet genoeg — elk beleid is gekoppeld aan een controle in het systeem.
      </p>

      {/* Snelnav */}
      <div className="mt-6 flex flex-wrap gap-2">
        {docs.map((d) => (
          <a key={d.slug} href={`#${d.slug}`} className="ph-chip bg-slate-100 text-slate-600 hover:bg-slate-200">{d.title}</a>
        ))}
      </div>

      <div className="mt-8 space-y-4">
        {docs.map((d) => (
          <section key={d.slug} id={d.slug} className="ph-card scroll-mt-24 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="ph-chip bg-slate-100 text-slate-500">{d.kind}</span>
                <h2 className="mt-2 text-xl font-bold text-slate-900">{d.title}</h2>
              </div>
              <div className="shrink-0 text-right text-xs text-slate-400">
                {d.owner && <div>Eigenaar: {d.owner}</div>}
                {d.review_date && <div>Review: {dateNL(d.review_date)}</div>}
              </div>
            </div>
            {d.summary && <p className="mt-2 font-medium text-slate-700">{d.summary}</p>}
            <p className="mt-2 text-slate-600">{d.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-10 ph-card bg-slate-50 p-6">
        <h3 className="font-semibold text-slate-900">Een zorg of incident melden?</h3>
        <p className="mt-1 text-sm text-slate-600">
          Meld het via je zending in de app of neem contact op. We bewaren bewijs (foto's, verzegeling,
          custody-log) voor onderzoek. Reageer nooit op verzoeken om betalingen buiten PakketHub om.
        </p>
      </div>
    </div>
  );
}
