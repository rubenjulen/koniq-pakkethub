"use server";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import { query } from "@/db/client";
import { audit } from "@/lib/audit";

const PLACEMENTS = ["MARKETPLACE", "HOME", "SIDEBAR"];

export async function createAdAction(formData: FormData) {
  const user = await requireCapability("control.view");
  const g = (k: string) => String(formData.get(k) ?? "").trim();
  if (!g("advertiser") || !g("title")) redirect("/app/ads?error=fields");
  const placement = PLACEMENTS.includes(g("placement")) ? g("placement") : "MARKETPLACE";
  await query(
    `INSERT INTO ads (tenant_id, advertiser, title, body, link_url, icon, placement, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,true)`,
    [user.tenantId, g("advertiser"), g("title"), g("body") || null, g("link_url") || null, g("icon") || "📣", placement]);
  await audit({ tenantId: user.tenantId, userId: user.id, action: "AD_CREATE", entityType: "ad", summary: g("advertiser") });
  redirect("/app/ads?ok=1");
}

export async function toggleAdAction(formData: FormData) {
  const user = await requireCapability("control.view");
  const id = String(formData.get("id") ?? "");
  await query(`UPDATE ads SET active = NOT active WHERE id=$1 AND tenant_id=$2`, [id, user.tenantId]);
  redirect("/app/ads?ok=1");
}

export async function deleteAdAction(formData: FormData) {
  const user = await requireCapability("control.view");
  const id = String(formData.get("id") ?? "");
  await query(`DELETE FROM ads WHERE id=$1 AND tenant_id=$2`, [id, user.tenantId]);
  redirect("/app/ads?ok=1");
}
