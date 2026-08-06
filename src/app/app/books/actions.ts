"use server";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { query } from "@/db/client";

export async function addAddressAction(formData: FormData) {
  const user = await requireSession();
  const g = (k: string) => String(formData.get(k) ?? "").trim();
  if (!g("name")) redirect("/app/books?error=fields");
  const isDefault = formData.get("is_default") === "on";
  if (isDefault) {
    await query(`UPDATE address_book SET is_default=false WHERE tenant_id=$1 AND owner_id=$2`, [user.tenantId, user.id]);
  }
  await query(
    `INSERT INTO address_book (tenant_id, owner_id, label, name, phone, line1, city, country, is_default)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [user.tenantId, user.id, g("label") || g("name"), g("name"), g("phone") || null, g("line1") || null, g("city") || null, g("country") || "SR", isDefault]);
  redirect("/app/books?ok=address");
}

export async function deleteAddressAction(formData: FormData) {
  const user = await requireSession();
  await query(`DELETE FROM address_book WHERE id=$1 AND owner_id=$2`, [String(formData.get("id") ?? ""), user.id]);
  redirect("/app/books?ok=deleted");
}

export async function addProductAction(formData: FormData) {
  const user = await requireSession();
  const g = (k: string) => String(formData.get(k) ?? "").trim();
  if (!g("name")) redirect("/app/books?error=fields");
  const val = parseFloat(g("value")); const wt = parseFloat(g("weight"));
  await query(
    `INSERT INTO product_book (tenant_id, owner_id, name, category_code, default_value_eur, default_weight_kg, hs_code)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [user.tenantId, user.id, g("name"), g("category_code") || "UNKNOWN",
     Number.isFinite(val) ? val : null, Number.isFinite(wt) ? wt : null, g("hs_code") || null]);
  redirect("/app/books?ok=product");
}

export async function deleteProductAction(formData: FormData) {
  const user = await requireSession();
  await query(`DELETE FROM product_book WHERE id=$1 AND owner_id=$2`, [String(formData.get("id") ?? ""), user.id]);
  redirect("/app/books?ok=deleted");
}
