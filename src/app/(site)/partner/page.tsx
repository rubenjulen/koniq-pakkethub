import { getTenantId } from "@/lib/tenant";
import { query } from "@/db/client";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Partner worden" };

async function submitPartnerLead(formData: FormData) {
  "use server";
  const tenantId = await getTenantId();
  const kind = String(formData.get("kind") ?? "PARTNER");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  if (!name || !email) redirect("/partner?error=1");
  await query(
    `INSERT INTO leads (tenant_id, kind, name, email, phone, corridor_code, payload)
     VALUES ($1,$2,$3,$4,$5,'NL-SR',$6)`,
    [tenantId, kind, name, email, phone, JSON.stringify({ message })]
  );
  redirect("/partner?ok=1");
}

const TYPES = [
  ["FLEET", "🚚", "Fleet / vervoerder", "Publiceer routes, voer legs uit met scan-bewijs, en reken per rit af."],
  ["PARTNER", "🏭", "Hub / service point", "Word intake-, inspectie- of afhaalpunt in de corridor."],
  ["BUSINESS", "🏢", "Zakelijke verzender", "SME's en instellingen: bulk, API, facturatie en SLA's."],
];

export default async function PartnerPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">Bouw mee aan de corridor</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        We breiden het netwerk gecontroleerd uit — fleets, hubs, warehouses en zakelijke verzenders.
        Onboarding met KYB, documenten en heldere afspraken.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {TYPES.map(([, icon, title, desc]) => (
          <div key={title} className="ph-card p-5">
            <div className="text-2xl">{icon}</div>
            <h3 className="mt-2 font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500">{desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 ph-card p-6">
        <h2 className="text-xl font-bold text-slate-900">Interesse? Laat je gegevens achter</h2>
        {ok && <div className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700 ring-1 ring-orange-200">Bedankt! We nemen contact op.</div>}
        {error && <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">Vul minimaal naam en e-mail in.</div>}
        <form action={submitPartnerLead} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="text-xs font-medium text-slate-600">Ik ben</span>
            <select name="kind" className={inp}>
              {TYPES.map(([val, , title]) => <option key={val} value={val}>{title}</option>)}
            </select>
          </label>
          <label className="block"><span className="text-xs font-medium text-slate-600">Naam / organisatie *</span><input name="name" required className={inp} /></label>
          <label className="block"><span className="text-xs font-medium text-slate-600">E-mail *</span><input name="email" type="email" required className={inp} /></label>
          <label className="block"><span className="text-xs font-medium text-slate-600">Telefoon</span><input name="phone" className={inp} /></label>
          <label className="block sm:col-span-2"><span className="text-xs font-medium text-slate-600">Bericht</span><textarea name="message" rows={3} className={inp} /></label>
          <div className="sm:col-span-2"><button className="ph-btn ph-btn-primary">Versturen</button></div>
        </form>
        <p className="mt-3 text-xs text-slate-500">
          We gebruiken je gegevens alleen om contact op te nemen over partnerschap. Zie het Trust Center voor privacy.
        </p>
      </div>
    </div>
  );
}
