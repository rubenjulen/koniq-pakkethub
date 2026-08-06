import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { query, queryOne } from "@/db/client";

const COOKIE = "pakkethub_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 dagen

export type SessionUser = {
  id: string;
  tenantId: string | null;
  email: string;
  name: string;
  firstName: string;
  phone: string | null;
  country: string | null;
  city: string | null;
  avatarUrl: string | null;
  roleKey: string | null;
  roleName: string | null;
  capabilities: string[];
  kycStatus: string;
  isPlatformAdmin: boolean;
};

export function hashPassword(pw: string) {
  return bcrypt.hashSync(pw, 10);
}
export function verifyPassword(pw: string, hash: string) {
  return bcrypt.compareSync(pw, hash);
}

export async function login(
  email: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await queryOne<{ id: string; tenant_id: string | null; password_hash: string; active: boolean }>(
    `SELECT id, tenant_id, password_hash, active FROM users WHERE lower(email) = lower($1) LIMIT 1`,
    [email.trim()]
  );
  if (!user || !user.active) return { ok: false, error: "Onbekende gebruiker of account inactief." };
  if (!verifyPassword(password, user.password_hash)) return { ok: false, error: "Onjuist wachtwoord." };

  const token = randomBytes(32).toString("hex");
  await query(
    `INSERT INTO sessions (id, user_id, tenant_id, token, expires_at) VALUES ($1,$2,$3,$4, now() + interval '7 days')`,
    [randomUUID(), user.id, user.tenant_id, token]
  );
  await query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [user.id]);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  return { ok: true };
}

export async function register(input: {
  firstName: string; lastName: string; email: string; phone?: string;
  password: string; role: "SENDER" | "TRAVELER";
}): Promise<{ ok: true } | { ok: false; error: "exists" | "fields" }> {
  const email = input.email.trim().toLowerCase();
  if (!input.firstName.trim() || !email || input.password.length < 6) return { ok: false, error: "fields" };

  const existing = await queryOne<{ id: string }>(`SELECT id FROM users WHERE lower(email) = $1 LIMIT 1`, [email]);
  if (existing) return { ok: false, error: "exists" };

  const tenant = await queryOne<{ id: string }>(`SELECT id FROM tenants WHERE slug = 'pakkethub' LIMIT 1`);
  if (!tenant) return { ok: false, error: "fields" };
  const role = await queryOne<{ id: string }>(`SELECT id FROM roles WHERE tenant_id = $1 AND key = $2 LIMIT 1`, [tenant.id, input.role]);

  const userId = randomUUID();
  await query(
    `INSERT INTO users (id, tenant_id, first_name, last_name, email, phone, password_hash, role_id, kyc_status, kyc_level, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'UNVERIFIED','NONE',true)`,
    [userId, tenant.id, input.firstName.trim(), input.lastName.trim(), email, input.phone?.trim() || null,
     hashPassword(input.password), role?.id ?? null]
  );

  // Direct inloggen na registratie.
  const token = randomBytes(32).toString("hex");
  await query(
    `INSERT INTO sessions (id, user_id, tenant_id, token, expires_at) VALUES ($1,$2,$3,$4, now() + interval '7 days')`,
    [randomUUID(), userId, tenant.id, token]
  );
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE,
  });
  return { ok: true };
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await query(`DELETE FROM sessions WHERE token = $1`, [token]);
  jar.delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const row = await queryOne<any>(
    `SELECT u.id, u.tenant_id, u.email, u.name, u.first_name, u.phone, u.country, u.city,
            u.avatar_url, u.is_platform_admin, u.kyc_status,
            r.key AS role_key, r.name AS role_name, r.capabilities AS capabilities
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN roles r ON r.id = u.role_id
      WHERE s.token = $1 AND s.expires_at > now() AND u.active = true`,
    [token]
  );
  if (!row) return null;

  return {
    id: row.id,
    tenantId: row.tenant_id,
    email: row.email,
    name: row.name,
    firstName: row.first_name,
    phone: row.phone,
    country: row.country,
    city: row.city,
    avatarUrl: row.avatar_url,
    roleKey: row.role_key,
    roleName: row.role_name,
    capabilities: Array.isArray(row.capabilities) ? row.capabilities : [],
    kycStatus: row.kyc_status,
    isPlatformAdmin: row.is_platform_admin,
  };
}

export async function requireSession(): Promise<SessionUser & { tenantId: string }> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!s.tenantId) redirect("/login");
  return s as SessionUser & { tenantId: string };
}

/** Vereist een specifieke capability; stuurt anders terug naar de app-home. */
export async function requireCapability(cap: string): Promise<SessionUser & { tenantId: string }> {
  const s = await requireSession();
  if (!hasCapability(s, cap)) redirect("/app");
  return s;
}

export function hasCapability(user: { capabilities: string[]; isPlatformAdmin?: boolean }, cap: string): boolean {
  if (user.isPlatformAdmin) return true;
  if (user.capabilities.includes("admin.all")) return true;
  return user.capabilities.includes(cap);
}
