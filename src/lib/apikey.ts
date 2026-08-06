import "server-only";
import bcrypt from "bcryptjs";
import { query } from "@/db/client";

/** Valideert een API-sleutel uit de Authorization: Bearer header. */
export async function authApiKey(req: Request, scope?: string): Promise<
  { ok: true; tenantId: string; businessId: string | null; scopes: string[] } | { ok: false; status: number; error: string }
> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, status: 401, error: "missing_api_key" };

  // Prefix beperkt de kandidatenset; daarna bcrypt-verificatie.
  const prefix = token.split("_").slice(0, 2).join("_"); // bv. pk_sandbox
  const rows = await query<any>(
    `SELECT id, tenant_id, business_id, key_hash, scopes, revoked FROM api_keys WHERE prefix=$1 AND revoked=false`,
    [prefix]
  );
  const match = rows.find((r) => bcrypt.compareSync(token, r.key_hash));
  if (!match) return { ok: false, status: 401, error: "invalid_api_key" };
  if (scope && !match.scopes.includes(scope)) return { ok: false, status: 403, error: "insufficient_scope" };

  await query(`UPDATE api_keys SET last_used_at=now() WHERE id=$1`, [match.id]);
  return { ok: true, tenantId: match.tenant_id, businessId: match.business_id, scopes: match.scopes };
}
