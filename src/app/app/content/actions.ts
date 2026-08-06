"use server";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import { query } from "@/db/client";
import { audit } from "@/lib/audit";

const YT = /(?:youtu\.be\/|v=|embed\/|shorts\/)?([A-Za-z0-9_-]{11})/;
function extractYt(input: string): string {
  const m = input.trim().match(YT);
  return m ? m[1] : input.trim();
}

export async function addVideoAction(formData: FormData) {
  const user = await requireCapability("control.view");
  const title = String(formData.get("title") ?? "").trim();
  const yt = extractYt(String(formData.get("youtube") ?? ""));
  const sort = parseInt(String(formData.get("sort_order") ?? "100"), 10) || 100;
  if (!title || !yt) redirect("/app/content?error=fields");
  const slug = "vid-" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  // title_i18n default: dezelfde titel in alle talen (redactie kan later verfijnen).
  const i18n = { nl: title, en: title, pt: title, es: title, fr: title };
  await query(
    `INSERT INTO content_items (tenant_id, slug, kind, title, body, title_i18n, status, sort_order)
     VALUES ($1,$2,'VIDEO',$3,$4,$5,'PUBLISHED',$6)`,
    [user.tenantId, slug, title, yt, JSON.stringify(i18n), sort]);
  await audit({ tenantId: user.tenantId, userId: user.id, action: "CONTENT_ADD", entityType: "content_item", summary: `VIDEO ${title}` });
  redirect("/app/content?ok=added");
}

export async function toggleVideoAction(formData: FormData) {
  const user = await requireCapability("control.view");
  const id = String(formData.get("id") ?? "");
  await query(
    `UPDATE content_items SET status = CASE WHEN status='PUBLISHED' THEN 'DRAFT' ELSE 'PUBLISHED' END
      WHERE id=$1 AND tenant_id=$2 AND kind='VIDEO'`, [id, user.tenantId]);
  await audit({ tenantId: user.tenantId, userId: user.id, action: "CONTENT_TOGGLE", entityType: "content_item", entityId: id });
  redirect("/app/content?ok=toggled");
}

export async function updateVideoAction(formData: FormData) {
  const user = await requireCapability("control.view");
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const yt = extractYt(String(formData.get("youtube") ?? ""));
  const sort = parseInt(String(formData.get("sort_order") ?? "100"), 10) || 100;
  await query(
    `UPDATE content_items SET title=$1, body=$2, sort_order=$3 WHERE id=$4 AND tenant_id=$5 AND kind='VIDEO'`,
    [title, yt, sort, id, user.tenantId]);
  await audit({ tenantId: user.tenantId, userId: user.id, action: "CONTENT_UPDATE", entityType: "content_item", entityId: id });
  redirect("/app/content?ok=updated");
}

export async function deleteVideoAction(formData: FormData) {
  const user = await requireCapability("control.view");
  const id = String(formData.get("id") ?? "");
  await query(`DELETE FROM content_items WHERE id=$1 AND tenant_id=$2 AND kind='VIDEO'`, [id, user.tenantId]);
  await audit({ tenantId: user.tenantId, userId: user.id, action: "CONTENT_DELETE", entityType: "content_item", entityId: id });
  redirect("/app/content?ok=deleted");
}
