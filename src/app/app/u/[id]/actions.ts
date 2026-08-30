"use server";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { query } from "@/db/client";

export async function followAction(formData: FormData) {
  const user = await requireSession();
  const target = String(formData.get("user_id") ?? "");
  if (target && target !== user.id) {
    await query(`INSERT INTO follows (follower_id, followee_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [user.id, target]);
  }
  redirect(`/app/u/${target}`);
}

export async function unfollowAction(formData: FormData) {
  const user = await requireSession();
  const target = String(formData.get("user_id") ?? "");
  await query(`DELETE FROM follows WHERE follower_id=$1 AND followee_id=$2`, [user.id, target]);
  redirect(`/app/u/${target}`);
}

/** Meld/rapporteer een gebruiker → belandt in het Control Center (safety). */
export async function reportUserAction(formData: FormData) {
  const user = await requireSession();
  const targetId = String(formData.get("target_id") ?? "");
  const reason = String(formData.get("reason") ?? "OTHER");
  const note = String(formData.get("note") ?? "").trim() || null;
  if (targetId && targetId !== user.id) {
    await query(
      `INSERT INTO reports (tenant_id, reporter_id, target_type, target_id, reason, note)
       VALUES ($1,$2,'USER',$3,$4,$5)`,
      [user.tenantId, user.id, targetId, reason, note]);
  }
  redirect(`/app/u/${targetId}?ok=reported`);
}
