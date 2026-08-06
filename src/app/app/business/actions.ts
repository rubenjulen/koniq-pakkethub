"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { requireCapability } from "@/lib/auth";
import { query, queryOne } from "@/db/client";
import { audit } from "@/lib/audit";
import { fireWebhooks } from "@/lib/webhooks";

async function firstBusiness(tenantId: string) {
  return queryOne<{ id: string }>(`SELECT id FROM business_accounts WHERE tenant_id=$1 ORDER BY created_at LIMIT 1`, [tenantId]);
}

export async function createApiKeyAction(formData: FormData) {
  const user = await requireCapability("control.view");
  const tenantId = user.tenantId;
  const label = String(formData.get("label") ?? "Nieuwe sleutel").trim();
  const biz = await firstBusiness(tenantId);

  const plain = `pk_sandbox_${randomBytes(18).toString("hex")}`;
  const prefix = plain.split("_").slice(0, 2).join("_");
  await query(
    `INSERT INTO api_keys (tenant_id, business_id, label, prefix, key_hash, scopes)
     VALUES ($1,$2,$3,$4,$5, $6)`,
    [tenantId, biz?.id ?? null, label, prefix, bcrypt.hashSync(plain, 10), ["quote", "booking", "tracking"]]
  );
  // Toon de volledige sleutel eenmalig via een korte flash-cookie (niet in de URL, niet in de DB).
  const jar = await cookies();
  jar.set("ph_new_key", plain, { httpOnly: true, sameSite: "lax", path: "/app/business", maxAge: 60 });
  await audit({ tenantId, userId: user.id, action: "APIKEY_CREATE", entityType: "api_key", summary: label });
  redirect("/app/business?created=1");
}

export async function revokeApiKeyAction(formData: FormData) {
  const user = await requireCapability("control.view");
  const id = String(formData.get("key_id") ?? "");
  await query(`UPDATE api_keys SET revoked=true WHERE id=$1 AND tenant_id=$2`, [id, user.tenantId]);
  await audit({ tenantId: user.tenantId, userId: user.id, action: "APIKEY_REVOKE", entityType: "api_key", entityId: id });
  redirect("/app/business");
}

export async function createWebhookAction(formData: FormData) {
  const user = await requireCapability("control.view");
  const tenantId = user.tenantId;
  const url = String(formData.get("url") ?? "").trim();
  const events = formData.getAll("events").map(String);
  if (!url) redirect("/app/business");
  const biz = await firstBusiness(tenantId);
  await query(
    `INSERT INTO webhooks (tenant_id, business_id, url, events, secret, active)
     VALUES ($1,$2,$3,$4,$5,true)`,
    [tenantId, biz?.id ?? null, url, events.length ? events : ["shipment.status"], `whsec_${randomBytes(12).toString("hex")}`]
  );
  await audit({ tenantId, userId: user.id, action: "WEBHOOK_CREATE", entityType: "webhook", summary: url });
  redirect("/app/business");
}

export async function testWebhookAction() {
  const user = await requireCapability("control.view");
  await fireWebhooks(user.tenantId, "shipment.status", { shipment_id: "demo", status: "TEST", note: "Testgebeurtenis vanuit Business-console" });
  redirect("/app/business?tested=1");
}
