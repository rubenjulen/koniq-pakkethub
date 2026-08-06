import { requireSession } from "@/lib/auth";
import { query } from "@/db/client";
import { KycBadge, SectionTitle, Chip } from "@/components/ui";
import { dateTimeNL } from "@/lib/format";
import { PROVIDERS } from "@/lib/adapters/config";
import { startKycAction, updateProfileAction, changePasswordAction } from "./actions";
import { getMessages } from "@/i18n";

export const metadata = { title: "Mijn account" };

export default async function AccountPage({ searchParams }: {
  searchParams: Promise<{ started?: string; saved?: string; perr?: string; pwok?: string; pwerr?: string }>;
}) {
  const user = await requireSession();
  const t = (await getMessages()).account;
  const sp = await searchParams;
  const verifications = await query<any>(
    `SELECT method, level, status, notes, created_at, reviewed_at FROM kyc_verifications
      WHERE user_id=$1 ORDER BY created_at DESC`,
    [user.id]
  );
  const pending = verifications.find((v) => v.status === "PENDING");
  const inp = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t.title}</h1>
        <p className="text-sm text-slate-500">{user.email} · {user.roleName}</p>
      </div>

      {/* Profiel bewerken */}
      <section className="ph-card p-5">
        <SectionTitle sub={t.profile_sub}>{t.profile}</SectionTitle>
        {sp.saved && <div className="mb-3 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700 ring-1 ring-orange-200">{t.saved}</div>}
        {sp.perr && <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{t.first_required}</div>}
        <form action={updateProfileAction} className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="text-sm font-medium text-slate-700">{t.first} *</span><input name="first_name" defaultValue={user.firstName} required className={inp} /></label>
          <label className="block"><span className="text-sm font-medium text-slate-700">{t.last}</span><input name="last_name" defaultValue={user.name.replace(user.firstName, "").trim()} className={inp} /></label>
          <label className="block"><span className="text-sm font-medium text-slate-700">{t.phone}</span><input name="phone" defaultValue={user.phone ?? ""} className={inp} /></label>
          <label className="block"><span className="text-sm font-medium text-slate-700">{t.city}</span><input name="city" defaultValue={user.city ?? ""} className={inp} /></label>
          <div className="sm:col-span-2"><button className="ph-btn ph-btn-primary">{t.save}</button></div>
        </form>
      </section>

      {/* KYC */}
      <section className="ph-card p-5">
        <div className="flex items-center justify-between">
          <SectionTitle sub={t.kyc_sub}>{t.kyc}</SectionTitle>
          <KycBadge status={user.kycStatus} />
        </div>
        {sp.started && (
          <div className="mb-3 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700 ring-1 ring-orange-200">
            {t.kyc_started}
          </div>
        )}
        {user.kycStatus === "VERIFIED" ? (
          <p className="text-sm text-slate-600">{t.kyc_verified}</p>
        ) : pending ? (
          <p className="text-sm text-amber-700">{t.kyc_pending.replace("{p}", PROVIDERS.kyc.name)}</p>
        ) : (
          <form action={startKycAction}>
            <p className="mb-3 text-sm text-slate-600">
              {t.kyc_intro.replace("{p}", PROVIDERS.kyc.name)}
            </p>
            <button className="ph-btn ph-btn-primary">{t.kyc_start}</button>
          </form>
        )}
      </section>

      {/* Wachtwoord wijzigen */}
      <section className="ph-card p-5">
        <SectionTitle sub={t.pw_sub}>{t.pw}</SectionTitle>
        {sp.pwok && <div className="mb-3 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700 ring-1 ring-orange-200">{t.pw_ok}</div>}
        {sp.pwerr && <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
          {sp.pwerr === "current" ? t.pw_err_current : t.pw_err_short}
        </div>}
        <form action={changePasswordAction} className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="text-sm font-medium text-slate-700">{t.pw_current}</span><input name="current" type="password" required className={inp} /></label>
          <label className="block"><span className="text-sm font-medium text-slate-700">{t.pw_next}</span><input name="next" type="password" required minLength={6} className={inp} /></label>
          <div className="sm:col-span-2"><button className="ph-btn ph-btn-ghost">{t.pw_change}</button></div>
        </form>
      </section>

      {verifications.length > 0 && (
        <section className="ph-card p-5">
          <SectionTitle>{t.history}</SectionTitle>
          <div className="divide-y divide-slate-100 text-sm">
            {verifications.map((v, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <span className="text-slate-600">{v.method} · {v.level}</span>
                <span className="flex items-center gap-2">
                  <Chip tone={v.status === "VERIFIED" ? "ok" : v.status === "REJECTED" ? "bad" : "warn"}>{v.status}</Chip>
                  <span className="text-xs text-slate-400">{dateTimeNL(v.created_at)}</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
