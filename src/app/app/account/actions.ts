"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession, hashPassword, verifyPassword } from "@/lib/auth";
import { startVerification } from "@/lib/adapters/kyc";
import { query, queryOne } from "@/db/client";
import { audit } from "@/lib/audit";

/** Start (simulatie) identiteitsverificatie voor de ingelogde gebruiker. */
export async function startKycAction() {
  const user = await requireSession();
  await startVerification({ tenantId: user.tenantId, userId: user.id, method: "ID_SCAN" });
  await audit({ tenantId: user.tenantId, userId: user.id, action: "KYC_START", entityType: "user", entityId: user.id });
  revalidatePath("/app/account");
  redirect("/app/account?started=1");
}

/** Werk het eigen profiel bij (naam, telefoon, plaats). */
export async function updateProfileAction(formData: FormData) {
  const user = await requireSession();
  const first = String(formData.get("first_name") ?? "").trim();
  const last = String(formData.get("last_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  if (!first) redirect("/app/account?perr=1");
  await query(
    `UPDATE users SET first_name=$1, last_name=$2, phone=$3, city=$4 WHERE id=$5`,
    [first, last, phone, city, user.id]
  );
  await audit({ tenantId: user.tenantId, userId: user.id, action: "PROFILE_UPDATE", entityType: "user", entityId: user.id });
  redirect("/app/account?saved=1");
}

/** Wijzig het eigen wachtwoord (met controle op het huidige). */
export async function changePasswordAction(formData: FormData) {
  const user = await requireSession();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next.length < 6) redirect("/app/account?pwerr=short");
  const row = await queryOne<{ password_hash: string }>(`SELECT password_hash FROM users WHERE id=$1`, [user.id]);
  if (!row || !verifyPassword(current, row.password_hash)) redirect("/app/account?pwerr=current");
  await query(`UPDATE users SET password_hash=$1 WHERE id=$2`, [hashPassword(next), user.id]);
  await audit({ tenantId: user.tenantId, userId: user.id, action: "PASSWORD_CHANGE", entityType: "user", entityId: user.id });
  redirect("/app/account?pwok=1");
}
