import { requireSession } from "@/lib/auth";
import { query } from "@/db/client";
import { getCategoriesList } from "@/lib/tenant";
import { Chip, SectionTitle, EmptyState } from "@/components/ui";
import { getMessages } from "@/i18n";
import { addAddressAction, deleteAddressAction, addProductAction, deleteProductAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Adres- & productboek" };

export default async function BooksPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await requireSession();
  const t = (await getMessages()).books;
  const sp = await searchParams;
  const inp = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500";

  const addresses = await query<any>(
    `SELECT id, label, name, phone, line1, city, country, is_default FROM address_book
      WHERE tenant_id=$1 AND owner_id=$2 ORDER BY is_default DESC, label`, [user.tenantId, user.id]);
  const products = await query<any>(
    `SELECT id, name, category_code, default_value_eur::float8 AS value, default_weight_kg::float8 AS weight, hs_code
       FROM product_book WHERE tenant_id=$1 AND owner_id=$2 ORDER BY name`, [user.tenantId, user.id]);
  const categories = await getCategoriesList(user.tenantId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">📇 {t.title}</h1>
        <p className="text-sm text-slate-500">{t.sub}</p>
      </div>
      {sp.error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">—</div>}

      {/* Adresboek */}
      <section className="ph-card p-5">
        <SectionTitle>{t.ab_title}</SectionTitle>
        {addresses.length === 0 ? <EmptyState icon="🏠" title={t.ab_none} /> : (
          <div className="mb-4 divide-y divide-slate-100">
            {addresses.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="font-medium text-slate-800">{a.label}</span>
                  {a.is_default && <Chip tone="ok">{t.ab_default}</Chip>}
                  <div className="text-xs text-slate-500">{a.name} · {a.phone ?? ""} · {[a.line1, a.city, a.country].filter(Boolean).join(", ")}</div>
                </div>
                <form action={deleteAddressAction}><input type="hidden" name="id" value={a.id} /><button className="text-slate-400 hover:text-rose-500" title={t.del}>✕</button></form>
              </div>
            ))}
          </div>
        )}
        <form action={addAddressAction} className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm"><span className="font-medium text-slate-700">{t.ab_label}</span><input name="label" className={inp} /></label>
          <label className="block text-sm"><span className="font-medium text-slate-700">{t.ab_name} *</span><input name="name" required className={inp} /></label>
          <label className="block text-sm"><span className="font-medium text-slate-700">{t.ab_phone}</span><input name="phone" className={inp} /></label>
          <label className="block text-sm"><span className="font-medium text-slate-700">{t.ab_line}</span><input name="line1" className={inp} /></label>
          <label className="block text-sm"><span className="font-medium text-slate-700">{t.ab_city}</span><input name="city" className={inp} /></label>
          <label className="block text-sm"><span className="font-medium text-slate-700">{t.ab_country}</span><input name="country" defaultValue="SR" className={inp} /></label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="is_default" /> {t.ab_default}</label>
          <div className="sm:col-span-2"><button className="ph-btn ph-btn-primary">{t.ab_save}</button></div>
        </form>
      </section>

      {/* Productboek */}
      <section className="ph-card p-5">
        <SectionTitle>{t.pb_title}</SectionTitle>
        {products.length === 0 ? <EmptyState icon="📦" title={t.pb_none} /> : (
          <div className="mb-4 divide-y divide-slate-100">
            {products.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="font-medium text-slate-800">{p.name}</span>
                  <Chip>{p.category_code}</Chip>
                  <div className="text-xs text-slate-500">
                    {p.value != null ? `€${p.value}` : "—"} · {p.weight != null ? `${p.weight} kg` : "—"}{p.hs_code ? ` · HS ${p.hs_code}` : ""}
                  </div>
                </div>
                <form action={deleteProductAction}><input type="hidden" name="id" value={p.id} /><button className="text-slate-400 hover:text-rose-500" title={t.del}>✕</button></form>
              </div>
            ))}
          </div>
        )}
        <form action={addProductAction} className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm"><span className="font-medium text-slate-700">{t.pb_name} *</span><input name="name" required className={inp} /></label>
          <label className="block text-sm"><span className="font-medium text-slate-700">{t.pb_cat}</span>
            <select name="category_code" className={inp}>{categories.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select>
          </label>
          <label className="block text-sm"><span className="font-medium text-slate-700">{t.pb_value}</span><input name="value" type="number" step="0.01" min="0" className={inp} /></label>
          <label className="block text-sm"><span className="font-medium text-slate-700">{t.pb_weight}</span><input name="weight" type="number" step="0.1" min="0" className={inp} /></label>
          <label className="block text-sm sm:col-span-2"><span className="font-medium text-slate-700">{t.pb_hs}</span><input name="hs_code" className={inp} /></label>
          <div className="sm:col-span-2"><button className="ph-btn ph-btn-primary">{t.pb_save}</button></div>
        </form>
      </section>
    </div>
  );
}
