import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, register } from "@/lib/auth";
import { getMessages } from "@/i18n";
import { getTenantId } from "@/lib/tenant";
import { RouteCardsMini } from "@/components/RouteCardsMini";
import { FacebookButton } from "@/components/FacebookButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account aanmaken" };

async function doRegister(formData: FormData) {
  "use server";
  const role = String(formData.get("role") ?? "SENDER") === "TRAVELER" ? "TRAVELER" : "SENDER";
  const res = await register({
    firstName: String(formData.get("first_name") ?? ""),
    lastName: String(formData.get("last_name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    password: String(formData.get("password") ?? ""),
    role,
  });
  if (res.ok) redirect("/app");
  redirect(`/aanmelden?role=${role}&error=${res.error}`);
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ role?: string; error?: string }> }) {
  if (await getSession()) redirect("/app");
  const { role, error } = await searchParams;
  const m = await getMessages();
  const tenantId = await getTenantId();
  const R = m.register;
  const selected = role === "TRAVELER" ? "TRAVELER" : "SENDER";
  const inp = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500";

  const ROLES: [string, string, string, string][] = [
    ["SENDER", "📦", R.as_sender, R.as_sender_d],
    ["TRAVELER", "🧳", R.as_traveler, R.as_traveler_d],
  ];

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 lg:grid-cols-[1fr_320px]">
     <div>
      <h1 className="text-3xl font-bold text-slate-900">{R.title}</h1>
      <p className="mt-2 text-slate-600">{R.sub}</p>

      {error && (
        <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
          {error === "exists" ? R.err_exists : R.err_fields}
        </div>
      )}

      <div className="mt-6"><FacebookButton label={m.common.fb_signup} note={m.login.fb_note} /></div>
      <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />{m.common.or}<span className="h-px flex-1 bg-slate-200" />
      </div>

      <form action={doRegister} className="space-y-4">
        <div>
          <span className="text-sm font-medium text-slate-700">{R.role_label}</span>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {ROLES.map(([val, icon, title, desc]) => (
              <label key={val} className="ph-card flex cursor-pointer gap-3 p-4 has-[:checked]:border-orange-500 has-[:checked]:ring-1 has-[:checked]:ring-orange-500">
                <input type="radio" name="role" value={val} defaultChecked={selected === val} className="mt-1" />
                <span>
                  <span className="block text-lg">{icon}</span>
                  <span className="block font-semibold text-slate-800">{title}</span>
                  <span className="block text-xs text-slate-500">{desc}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="text-sm font-medium text-slate-700">{R.first_name} *</span><input name="first_name" required className={inp} /></label>
          <label className="block"><span className="text-sm font-medium text-slate-700">{R.last_name}</span><input name="last_name" className={inp} /></label>
          <label className="block"><span className="text-sm font-medium text-slate-700">{R.email} *</span><input name="email" type="email" required className={inp} /></label>
          <label className="block"><span className="text-sm font-medium text-slate-700">{R.phone}</span><input name="phone" className={inp} /></label>
          <label className="block sm:col-span-2"><span className="text-sm font-medium text-slate-700">{R.password} *</span><input name="password" type="password" required minLength={6} className={inp} /></label>
        </div>

        <p className="text-xs text-slate-500">{R.kyc_hint}</p>
        <button className="ph-btn ph-btn-primary w-full">{R.create}</button>
      </form>

      <div className="mt-6 flex flex-col gap-1.5 text-sm text-slate-500">
        <span>{R.have_account} <Link href="/login" className="font-medium text-orange-600 hover:underline">{m.common.login}</Link></span>
        <Link href="/partner" className="text-xs text-orange-600 hover:underline">{R.partner_note}</Link>
      </div>
     </div>

      <aside className="hidden h-max rounded-2xl bg-gradient-to-b from-[#4a3b26] to-[#2b2416] p-5 text-white lg:block">
        <h2 className="text-lg font-bold">{m.login.routes_found} ✈️</h2>
        <p className="mt-1 text-xs text-white/70">{m.login.routes_found_sub}</p>
        <div className="mt-4"><RouteCardsMini tenantId={tenantId} departsLabel={m.mkt2.depart} limit={4} /></div>
      </aside>
    </div>
  );
}
