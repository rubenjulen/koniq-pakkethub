"use server";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { query, queryOne } from "@/db/client";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/adapters/notifications";
import { suggestCategory } from "@/lib/adapters/ai";
import { getTenantId, getCorridors } from "@/lib/tenant";

export async function createShoppingRequestAction(formData: FormData) {
  const user = await requireSession();
  const tenantId = user.tenantId;
  const product = String(formData.get("product_name") ?? "").trim();
  const url = String(formData.get("product_url") ?? "").trim() || null;
  const qty = parseInt(String(formData.get("quantity") ?? "1")) || 1;
  const budget = parseFloat(String(formData.get("budget_eur") ?? "")) || null;
  const reward = parseFloat(String(formData.get("reward_eur") ?? "")) || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!product) redirect("/app/shop?error=Vul+een+product+in");

  const corridors = await getCorridors(tenantId);
  const corridor = corridors.find((c) => c.status === "PILOT") ?? corridors[0];
  const cat = suggestCategory(product); // AI-suggestie voor de categorie

  await query(
    `INSERT INTO shopping_requests (tenant_id, requester_id, corridor_id, product_name, product_url,
        quantity, budget_eur, reward_eur, category_code, notes, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'OPEN')`,
    [tenantId, user.id, corridor?.id ?? null, product, url, qty, budget, reward, cat.code, notes]
  );
  await audit({ tenantId, userId: user.id, action: "SHOPREQ_CREATE", entityType: "shopping_request", summary: product });
  redirect("/app/shop?ok=1");
}

export async function claimShoppingRequestAction(formData: FormData) {
  const user = await requireSession();
  const tenantId = user.tenantId;
  const reqId = String(formData.get("request_id") ?? "");
  const r = await queryOne<any>(`SELECT id, requester_id, product_name, status FROM shopping_requests WHERE id=$1 AND tenant_id=$2`, [reqId, tenantId]);
  if (!r || r.status !== "OPEN") redirect("/app/shop");

  await query(`UPDATE shopping_requests SET status='CLAIMED', claimed_by=$1 WHERE id=$2`, [user.id, reqId]);
  await query(
    `INSERT INTO purchase_tasks (tenant_id, shopping_request_id, traveler_id, status) VALUES ($1,$2,$3,'PENDING')`,
    [tenantId, reqId, user.id]
  );
  await notify({ tenantId, userId: r.requester_id, template: "SHOPREQ_CLAIMED", title: "Reiziger gevonden",
    body: `${user.firstName} gaat "${r.product_name}" voor je kopen.` });
  await audit({ tenantId, userId: user.id, action: "SHOPREQ_CLAIM", entityType: "shopping_request", entityId: reqId });
  redirect("/app/shop");
}

export async function markPurchasedAction(formData: FormData) {
  const user = await requireSession();
  const tenantId = user.tenantId;
  const reqId = String(formData.get("request_id") ?? "");
  const receipt = String(formData.get("receipt_ref") ?? "").trim() || null;
  const amount = parseFloat(String(formData.get("amount_paid_eur") ?? "")) || null;

  await query(`UPDATE purchase_tasks SET status='PURCHASED', receipt_ref=$1, amount_paid_eur=$2 WHERE shopping_request_id=$3 AND traveler_id=$4`,
    [receipt, amount, reqId, user.id]);
  await query(`UPDATE shopping_requests SET status='PURCHASED' WHERE id=$1`, [reqId]);
  const r = await queryOne<any>(`SELECT requester_id, product_name FROM shopping_requests WHERE id=$1`, [reqId]);
  await notify({ tenantId, userId: r?.requester_id, template: "SHOPREQ_PURCHASED", title: "Product gekocht",
    body: `"${r?.product_name}" is gekocht (bon ${receipt ?? "—"}). Het reist mee via de gecontroleerde overdracht.` });
  await audit({ tenantId, userId: user.id, action: "SHOPREQ_PURCHASED", entityType: "shopping_request", entityId: reqId });
  redirect("/app/shop");
}
