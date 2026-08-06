import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, login } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getLocale, getMessages } from "@/i18n";

export const metadata = { title: "Inloggen" };

async function doLogin(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const res = await login(email, password);
  if (res.ok) redirect("/app");
  redirect(`/login?error=${encodeURIComponent(res.error)}`);
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getSession()) redirect("/app");
  const { error } = await searchParams;
  const [m, locale] = await Promise.all([getMessages(), getLocale()]);
  const L = m.login;

  const DEMO: [string, string][] = [
    [L.role_sender, "sender@pakkethub.com"],
    [L.role_traveler, "traveler@pakkethub.com"],
    [L.role_hub, "hub@pakkethub.com"],
    [L.role_admin, "admin@pakkethub.com"],
  ];

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-slate-900 p-10 text-white lg:flex">
        <Logo light />
        <div>
          <h1 className="max-w-md text-3xl font-bold leading-tight">{L.hero_title}</h1>
          <p className="mt-4 max-w-md text-slate-300">{L.hero_sub}</p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs">
            {[m.home.spine1_t, m.home.spine2_t, m.home.spine3_t, m.home.spine4_t, m.home.spine5_t].map((t) => (
              <span key={t} className="rounded-full bg-white/10 px-3 py-1">{t}</span>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-400">{L.domain_note}</p>
      </div>

      <div className="flex flex-col p-6">
        <div className="flex justify-end"><LanguageSwitcher current={locale} /></div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="mb-6 lg:hidden"><Logo /></div>
            <h2 className="text-xl font-bold text-slate-900">{L.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{L.welcome}</p>

            {error && (
              <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>
            )}

            <form action={doLogin} className="mt-5 space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700">{L.email}</label>
                <input name="email" type="email" required defaultValue="sender@pakkethub.com"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">{L.password}</label>
                <input name="password" type="password" required defaultValue="demo12345"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
              </div>
              <button type="submit" className="ph-btn ph-btn-primary w-full">{m.common.login}</button>
            </form>

            <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              <div className="mb-1 font-semibold text-slate-700">{L.demo_accounts}</div>
              <ul className="space-y-0.5">
                {DEMO.map(([role, mail]) => (
                  <li key={mail} className="flex justify-between gap-2">
                    <span>{role}</span><span className="font-mono text-slate-500">{mail}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-6 text-center text-sm text-slate-500">
              <Link href="/" className="font-medium text-orange-600 hover:underline">{m.common.back_to_site}</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
