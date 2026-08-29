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
