import "server-only";
import { query } from "@/db/client";

export type SortKey = "date" | "price_asc" | "price_desc" | "rating";
export type RouteFilters = { from?: string; to?: string; verified?: boolean; priceMax?: number | null; size?: string; sort?: SortKey };
export type RequestFilters = { from?: string; to?: string; verified?: boolean; priceMax?: number | null; weightMax?: number | null; sort?: SortKey };

function routeOrder(sort?: SortKey): string {
  switch (sort) {
    case "price_asc": return `coalesce(t.price_indication_eur,0) ASC, t.created_at DESC`;
    case "price_desc": return `coalesce(t.price_indication_eur,0) DESC, t.created_at DESC`;
    case "rating": return `stars DESC NULLS LAST, t.created_at DESC`;
    default: return `t.depart_date NULLS LAST, t.created_at DESC`;
  }
}
function requestOrder(sort?: SortKey): string {
  switch (sort) {
    case "price_asc": return `coalesce(s.offered_price_eur,0) ASC, s.created_at DESC`;
    case "price_desc": return `coalesce(s.offered_price_eur,0) DESC, s.created_at DESC`;
    case "rating": return `stars DESC NULLS LAST, s.created_at DESC`;
    default: return `s.deadline NULLS LAST, s.created_at DESC`;
  }
}

/** Zichtbare ROUTES (reizigers die ruimte aanbieden) — voor afzenders om te bekijken. */
export async function getRoutes(tenantId: string, f: RouteFilters = {}) {
  const where: string[] = [`t.tenant_id=$1`, `t.visible=true`, `t.status='OPEN'`];
  const params: unknown[] = [tenantId];
  if (f.from) { params.push(`%${f.from}%`); where.push(`c.name ILIKE $${params.length}`); }
  if (f.to) { params.push(`%${f.to}%`); where.push(`(u.city ILIKE $${params.length} OR c.name ILIKE $${params.length})`); }
  if (f.verified) where.push(`u.kyc_status='VERIFIED'`);
  if (f.priceMax != null) { params.push(f.priceMax); where.push(`coalesce(t.price_indication_eur,0) <= $${params.length}`); }
  if (f.size) { params.push(f.size); where.push(`t.package_size = $${params.length}`); }
  return query<any>(
    `SELECT t.id, t.depart_date, t.arrive_date, t.capacity_kg::float8 AS capacity,
            t.price_indication_eur::float8 AS price, t.short_info, t.package_size,
            u.id AS user_id, u.name, u.city, u.country, u.avatar_url, (u.kyc_status='VERIFIED') AS verified,
            c.name AS corridor,
            (SELECT round(avg(stars)::numeric,1)::float8 FROM ratings r WHERE r.ratee_id=u.id AND r.role='CARRIER') AS stars,
            (SELECT count(*)::int FROM ratings r WHERE r.ratee_id=u.id AND r.role='CARRIER') AS stars_n
       FROM trips t JOIN users u ON u.id=t.traveler_id JOIN corridors c ON c.id=t.corridor_id
      WHERE ${where.join(" AND ")}
      ORDER BY ${routeOrder(f.sort)} LIMIT 60`,
    params
  );
}

/** Zichtbare VERZOEKEN (afzenders die iets willen sturen) — voor reizigers om te bekijken. */
export async function getRequests(tenantId: string, f: RequestFilters = {}) {
  const where: string[] = [`s.tenant_id=$1`, `s.visible=true`, `s.eligibility='ALLOW'`, `s.status IN ('QUOTED','SCREENING','BOOKED')`];
  const params: unknown[] = [tenantId];
  if (f.from) { params.push(`%${f.from}%`); where.push(`c.name ILIKE $${params.length}`); }
  if (f.to) { params.push(`%${f.to}%`); where.push(`(s.recipient_city ILIKE $${params.length} OR c.name ILIKE $${params.length})`); }
  if (f.verified) where.push(`u.kyc_status='VERIFIED'`);
  if (f.priceMax != null) { params.push(f.priceMax); where.push(`coalesce(s.offered_price_eur,0) <= $${params.length}`); }
  if (f.weightMax != null) { params.push(f.weightMax); where.push(`coalesce(s.declared_weight_kg,0) <= $${params.length}`); }
  return query<any>(
    `SELECT s.id, s.reference, s.deadline, s.declared_weight_kg::float8 AS kg,
            s.offered_price_eur::float8 AS price, s.request_info, s.recipient_city, s.recipient_country,
            u.id AS user_id, u.name, u.city, u.country, u.avatar_url, (u.kyc_status='VERIFIED') AS verified,
            c.name AS corridor,
            (SELECT round(avg(stars)::numeric,1)::float8 FROM ratings r WHERE r.ratee_id=u.id AND r.role='CLIENT') AS stars,
            (SELECT count(*)::int FROM ratings r WHERE r.ratee_id=u.id AND r.role='CLIENT') AS stars_n
       FROM shipments s JOIN users u ON u.id=s.sender_id JOIN corridors c ON c.id=s.corridor_id
      WHERE ${where.join(" AND ")}
      ORDER BY ${requestOrder(f.sort)} LIMIT 60`,
    params
  );
}
