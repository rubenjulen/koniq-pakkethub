import { requireSession } from "@/lib/auth";
import { query } from "@/db/client";
import { KycBadge, SectionTitle, Chip } from "@/components/ui";
import { dateTimeNL } from "@/lib/format";
import { PROVIDERS } from "@/lib/adapters/config";
import { startKycAction, updateProfileAction, changePasswordAction } from "./actions";

export const metadata = { title: "Mijn account" };

export default async function AccountPage({ searchParams }: {
  searchParams: Promise<{ started?: string; saved?: string; perr?: string; pwok?: string; pwerr?: string }>;
}) {
  const user = await requireSession();
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
        <h1 className="text-xl font-bold text-slate-900">Mijn account</h1>
        <p className="text-sm text-slate-500">{user.email} · {user.roleName}</p>
      </div>

      {/* Profiel bewerken */}
      <section className="ph-card p-5">
        <SectionTitle sub="Je naam en contactgegevens">Profiel</SectionTitle>
        {sp.saved && <div className="mb-3 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700 ring-1 ring-orange-200">Profiel opgeslagen.</div>}
        {sp.perr && <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">Voornaam is verplicht.</div>}
        <form action={updateProfileAction} className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="text-sm font-medium text-slate-700">Voornaam *</span><input name="first_name" defaultValue={user.firstName} required className={inp} /></label>
          <label className="block"><span className="text-sm font-medium text-slate-700">Achternaam</span><input name="last_name" defaultValue={user.name.replace(user.firstName, "").trim()} className={inp} /></label>
          <label className="block"><span className="text-sm font-medium text-slate-700">Telefoon</span><input name="phone" defaultValue={user.phone ?? ""} className={inp} /></label>
          <label className="block"><span className="text-sm font-medium text-slate-700">Plaats</span><input name="city" defaultValue={user.city ?? ""} className={inp} /></label>
          <div className="sm:col-span-2"><button className="ph-btn ph-btn-primary">Opslaan</button></div>
        </form>
      </section>

      {/* KYC */}
      <section className="ph-card p-5">
        <div className="flex items-center justify-between">
          <SectionTitle sub="Verificatie is vereist voordat er waarde beweegt">Identiteit (KYC)</SectionTitle>
          <KycBadge status={user.kycStatus} />
        </div>
        {sp.started && (
          <div className="mb-3 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700 ring-1 ring-orange-200">
            Verificatie gestart. In de sandbox keurt een beoordelaar dit goed of af via de Test Console.
          </div>
        )}
        {user.kycStatus === "VERIFIED" ? (
          <p className="text-sm text-slate-600">✓ Je identiteit is geverifieerd. Je kunt betalen, boeken en uitbetaald worden.</p>
        ) : pending ? (
          <p className="text-sm text-amber-700">Je verificatie wordt beoordeeld (simulatie via {PROVIDERS.kyc.name}).</p>
        ) : (
          <form action={startKycAction}>
            <p className="mb-3 text-sm text-slate-600">
              Start de identiteitsverificatie. In de demo wordt dit gesimuleerd door <em>{PROVIDERS.kyc.name}</em>;
              bij livegang koppelt PakketHub een IDV-provider.
            </p>
            <button className="ph-btn ph-btn-primary">Start verificatie</button>
          </form>
        )}
      </section>

      {/* Wachtwoord wijzigen */}
      <section className="ph-card p-5">
        <SectionTitle sub="Kies een nieuw wachtwoord (minimaal 6 tekens)">Wachtwoord</SectionTitle>
        {sp.pwok && <div className="mb-3 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700 ring-1 ring-orange-200">Wachtwoord gewijzigd.</div>}
        {sp.pwerr && <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
          {sp.pwerr === "current" ? "Huidig wachtwoord klopt niet." : "Nieuw wachtwoord is te kort."}
        </div>}
        <form action={changePasswordAction} className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="text-sm font-medium text-slate-700">Huidig wachtwoord</span><input name="current" type="password" required className={inp} /></label>
          <label className="block"><span className="text-sm font-medium text-slate-700">Nieuw wachtwoord</span><input name="next" type="password" required minLength={6} className={inp} /></label>
          <div className="sm:col-span-2"><button className="ph-btn ph-btn-ghost">Wachtwoord wijzigen</button></div>
        </form>
      </section>

      {verifications.length > 0 && (
        <section className="ph-card p-5">
          <SectionTitle>Verificatie-historie</SectionTitle>
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
