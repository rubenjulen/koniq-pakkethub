"use server";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/db/client";
import { getTenantId } from "@/lib/tenant";
import { login, hashPassword } from "@/lib/auth";

/**
 * Gesimuleerde "Doorgaan met Facebook". Bij livegang komt hier de echte Facebook-
 * OAuth (integratiegrens); nu zorgt dit voor een gedemonstreerde social-login: een
 * vaste demo-FB-gebruiker wordt aangemaakt (indien nodig) en ingelogd.
 */
export async function facebookLoginAction() {
  const tenantId = await getTenantId();
  const email = "facebook.demo@bugawuga.app";
  const existing = await queryOne<{ id: string }>(`SELECT id FROM users WHERE lower(email)=lower($1) LIMIT 1`, [email]);
  if (!existing) {
    const role = await queryOne<{ id: string }>(`SELECT id FROM roles WHERE tenant_id=$1 AND key='SENDER' LIMIT 1`, [tenantId]);
    await query(
      `INSERT INTO users (tenant_id, first_name, last_name, email, password_hash, role_id,
                          country, city, kyc_status, auth_provider, registered)
       VALUES ($1,'Sam','(Facebook)',$2,$3,$4,'SR','Paramaribo','VERIFIED','FACEBOOK',true)`,
      [tenantId, email, hashPassword("demo12345"), role?.id]
    );
  }
  const res = await login(email, "demo12345");
  redirect(res.ok ? "/app" : "/login?error=facebook");
}
