import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, login } from "@/lib/auth";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Inloggen" };

async function doLogin(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const res = await login(email, password);
  if (res.ok) redirect("/app");
  redirect(`/login?error=${encodeURIComponent(res.error)}`);
}

const DEMO = [
  ["Afzender", "sender@pakkethub.com"],
  ["Reiziger", "traveler@pakkethub.com"],
  ["Hub / operatie", "hub@pakkethub.com"],
  ["Platformbeheer", "admin@pakkethub.com"],
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getSession()) redirect("/app");
  const { error } = await searchParams;

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Left: brand panel */}
      <div className="hidden flex-col justify-between bg-slate-900 p-10 text-white lg:flex">
        <Logo light />
        <div>
          <h1 className="max-w-md text-3xl font-bold leading-tight">
            Eén gecontroleerde corridor voor mensen, pakketten en reizigers.
          </h1>
          <p className="mt-4 max-w-md text-slate-300">
            Aangifte, inspectie, verzegeling en veilige overdracht — met chat tussen afzender en reiziger.
            Betaling wordt vastgehouden tot bewijs van levering.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs">
            {["Positieve lijst", "Geverifieerde identiteit", "Open inspectie", "Custody-log", "Beschermde betaling"].map((t) => (
              <span key={t} className="rounded-full bg-white/10 px-3 py-1">{t}</span>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-400">
          PakketHub.com — pilot Nederland → Suriname. Domein nog niet geactiveerd.
        </p>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 lg:hidden"><Logo /></div>
          <h2 className="text-xl font-bold text-slate-900">Inloggen</h2>
          <p className="mt-1 text-sm text-slate-500">Welkom terug bij PakketHub.</p>

          {error && (
            <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
              {error}
            </div>
          )}

          <form action={doLogin} className="mt-5 space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700">E-mail</label>
              <input name="email" type="email" required defaultValue="sender@pakkethub.com"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Wachtwoord</label>
              <input name="password" type="password" required defaultValue="demo12345"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
            </div>
            <button type="submit" className="ph-btn ph-btn-primary w-full">Inloggen</button>
          </form>

          <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <div className="mb-1 font-semibold text-slate-700">Demo-accounts (wachtwoord: demo12345)</div>
            <ul className="space-y-0.5">
              {DEMO.map(([role, mail]) => (
                <li key={mail} className="flex justify-between gap-2">
                  <span>{role}</span><span className="font-mono text-slate-500">{mail}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            <Link href="/" className="font-medium text-orange-600 hover:underline">← Terug naar de website</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
