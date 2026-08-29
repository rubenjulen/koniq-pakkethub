import { requireCapability } from "@/lib/auth";
import { query } from "@/db/client";
import { Chip, SectionTitle } from "@/components/ui";
import { getMessages } from "@/i18n";
import { inviteMemberAction, banMemberAction, reactivateMemberAction, groupEmailAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leden" };

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; n?: string }> }) {
  const user = await requireCapability("admin.all");
  const t = (await getMessages()).members;
  const sp = await searchParams;
  const inp = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

  const members = await query<any>(
    `SELECT u.id, u.name, u.email, u.active, u.kyc_status, u.auth_provider, r.name AS role
       FROM users u LEFT JOIN roles r ON r.id=u.role_id
      WHERE u.tenant_id=$1 ORDER BY u.active DESC, u.created_at DESC LIMIT 100`,
    [user.tenantId]
  );

  const notice = sp.ok === "invited" ? t.ok_invited : sp.ok === "banned" ? t.ok_banned : sp.ok === "reactivated" ? t.ok_reactivated
    : sp.ok === "emailed" ? `${t.ok_emailed}${sp.n ? ` (${sp.n})` : ""}` : null;
  const err = sp.error === "exists" ? t.err_exists : sp.error ? t.err_fields : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">👥 {t.title}</h1>
        <p className="text-sm text-slate-500">{t.sub}</p>
      </div>
      {notice && <div className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700 ring-1 ring-orange-200">{notice}</div>}
      {err && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{err}</div>}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="ph-card p-4">
          <SectionTitle sub={t.invite_sub}>{t.invite}</SectionTitle>
          <form action={inviteMemberAction} className="space-y-2">
            <label className="block text-sm">{t.first_name}<input name="first_name" required className={inp} /></label>
            <label className="block text-sm">{t.email}<input name="email" type="email" required className={inp} /></label>
            <label className="block text-sm">{t.role}
              <select name="role" className={inp}>
                <option value="SENDER">{t.role_sender}</option>
                <option value="TRAVELER">{t.role_traveler}</option>
                <option value="OPS">{t.role_ops}</option>
              </select>
            </label>
            <button className="ph-btn ph-btn-primary text-sm">{t.invite_btn}</button>
          </form>
        </section>

        <section className="ph-card p-4">
          <SectionTitle sub={t.email_sub}>{t.email_title}</SectionTitle>
          <form action={groupEmailAction} className="space-y-2">
            <label className="block text-sm">{t.subject}<input name="subject" required className={inp} /></label>
            <label className="block text-sm">{t.body}<textarea name="body" rows={3} required className={inp} /></label>
            <button className="ph-btn ph-btn-primary text-sm">{t.send_email}</button>
          </form>
        </section>
      </div>

      <section>
        <SectionTitle>{t.list} ({members.length})</SectionTitle>
        <div className="ph-card mt-2 divide-y divide-slate-100">
          {members.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">{m.name}</span>
                  {m.kyc_status === "VERIFIED" && <span className="text-xs text-orange-600" title={t.verified}>✓</span>}
                  {m.auth_provider === "FACEBOOK" && <span className="text-xs text-[#1877F2]">f</span>}
                </div>
                <div className="text-xs text-slate-500">{m.email} · {m.role}</div>
              </div>
              <div className="flex items-center gap-2">
                <Chip tone={m.active ? "ok" : "bad"}>{m.active ? t.active : t.banned}</Chip>
                {m.id !== user.id && (m.active ? (
                  <form action={banMemberAction}><input type="hidden" name="user_id" value={m.id} /><button className="text-xs text-rose-500 hover:underline">{t.ban}</button></form>
                ) : (
                  <form action={reactivateMemberAction}><input type="hidden" name="user_id" value={m.id} /><button className="text-xs text-orange-600 hover:underline">{t.reactivate}</button></form>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
