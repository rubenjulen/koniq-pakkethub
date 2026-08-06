import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getLocale, getMessages } from "@/i18n";

export const metadata = { title: "Staging-toegang" };
export const dynamic = "force-dynamic";

async function submitGate(formData: FormData) {
  "use server";
  const pass = process.env.STAGING_PASSWORD;
  const given = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/") || "/";
  if (pass && given === pass) {
    const jar = await cookies();
    jar.set("ph_staging", pass, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
      path: "/", maxAge: 60 * 60 * 24 * 30,
    });
    redirect(next.startsWith("/") ? next : "/");
  }
  redirect(`/gate?error=1&next=${encodeURIComponent(next)}`);
}

export default async function GatePage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  const [m, locale] = await Promise.all([getMessages(), getLocale()]);
  const G = m.gate;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#1c1c1c] p-6 text-white">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-between">
          <Logo light />
          <LanguageSwitcher current={locale} light />
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#2e2e2e] p-6 shadow-2xl">
          <div className="mb-1 inline-block rounded-full bg-orange-600 px-3 py-0.5 text-xs font-semibold">{G.badge}</div>
          <h1 className="mt-2 text-lg font-bold">{G.title}</h1>
          <p className="mt-1 text-sm text-slate-300">{G.sub}</p>
          {error && <div className="mt-3 rounded-lg bg-rose-500/20 px-3 py-2 text-sm text-rose-200">{G.error}</div>}
          <form action={submitGate} className="mt-4 space-y-3">
            <input type="hidden" name="next" value={next ?? "/"} />
            <input name="password" type="password" required autoFocus placeholder={G.placeholder}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:border-orange-500" />
            <button className="ph-btn ph-btn-primary w-full">{G.submit}</button>
          </form>
          <p className="mt-4 text-xs text-slate-400">{G.hint}</p>
        </div>
      </div>
    </main>
  );
}
