"use server";
import { redirect } from "next/navigation";
import { requireCapability, hashPassword } from "@/lib/auth";
import { query, queryOne } from "@/db/client";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/adapters/notifications";

/** Admin nodigt een nieuw lid uit (maakt account + stuurt uitnodiging via outbox). */
export async function inviteMemberAction(formData: FormData) {
  const user = await requireCapability("admin.all");
  const tenantId = user.tenantId;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const firstName = String(formData.get("first_name") ?? "").trim();
  const roleKey = ["SENDER", "TRAVELER", "OPS"].includes(String(formData.get("role"))) ? String(formData.get("role")) : "SENDER";
  if (!email || !firstName) redirect("/app/members?error=fields");
  const exists = await queryOne<{ id: string }>(`SELECT id FROM users WHERE lower(email)=$1 LIMIT 1`, [email]);
  if (exists) redirect("/app/members?error=exists");

  const role = await queryOne<{ id: string }>(`SELECT id FROM roles WHERE tenant_id=$1 AND key=$2 LIMIT 1`, [tenantId, roleKey]);
  const row = await queryOne<{ id: string }>(
    `INSERT INTO users (tenant_id, first_name, last_name, email, password_hash, role_id, kyc_status, registered, auth_provider)
     VALUES ($1,$2,'',$3,$4,$5,'UNVERIFIED',true,'PASSWORD') RETURNING id`,
    [tenantId, firstName, email, hashPassword("demo12345"), role?.id]);
  await notify({ tenantId, userId: row?.id, channel: "EMAIL", template: "invite",
    title: "Welkom bij BugaWuga", body: `Hoi ${firstName}, je bent uitgenodigd voor BugaWuga. Log in met ${email} (tijdelijk wachtwoord: demo12345).` });
  await audit({ tenantId, userId: user.id, action: "MEMBER_INVITE", entityType: "user", entityId: row?.id, summary: email });
  redirect("/app/members?ok=invited");
}

export async function banMemberAction(formData: FormData) {
  const user = await requireCapability("admin.all");
  const id = String(formData.get("user_id") ?? "");
  if (id && id !== user.id) {
    await query(`UPDATE users SET active=false WHERE id=$1 AND tenant_id=$2`, [id, user.tenantId]);
    await audit({ tenantId: user.tenantId, userId: user.id, action: "MEMBER_BAN", entityType: "user", entityId: id });
  }
  redirect("/app/members?ok=banned");
}

export async function reactivateMemberAction(formData: FormData) {
  const user = await requireCapability("admin.all");
  const id = String(formData.get("user_id") ?? "");
  await query(`UPDATE users SET active=true WHERE id=$1 AND tenant_id=$2`, [id, user.tenantId]);
  await audit({ tenantId: user.tenantId, userId: user.id, action: "MEMBER_REACTIVATE", entityType: "user", entityId: id });
  redirect("/app/members?ok=reactivated");
}

/** Groepsmail naar alle actieve leden (via de notificatie-outbox, sim). */
export async function groupEmailAction(formData: FormData) {
  const user = await requireCapability("admin.all");
  const tenantId = user.tenantId;
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!subject || !body) redirect("/app/members?error=fields");
  const members = await query<{ id: string }>(`SELECT id FROM users WHERE tenant_id=$1 AND active=true`, [tenantId]);
  for (const m of members) {
    await notify({ tenantId, userId: m.id, channel: "EMAIL", template: "broadcast", title: subject, body });
  }
  await audit({ tenantId, userId: user.id, action: "GROUP_EMAIL", entityType: "tenant", summary: `${members.length} ontvangers: ${subject}` });
  redirect(`/app/members?ok=emailed&n=${members.length}`);
}
