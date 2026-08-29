import "server-only";
import { query, queryOne } from "@/db/client";
import type { CategoryRule, CorridorLimits } from "./eligibility";

/** In deze single-tenant pilot is er één BugaWuga-tenant. */
export async function getTenantId(): Promise<string> {
  const row = await queryOne<{ id: string }>(`SELECT id FROM tenants WHERE slug = 'pakkethub' LIMIT 1`);
  return row?.id ?? "10000000-0000-0000-0000-000000000001";
}

export type CorridorRow = CorridorLimits & {
  id: string;
  code: string;
  name: string;
  from_country: string;
  to_country: string;
  service_modes: string[];
};

export async function getCorridors(tenantId: string): Promise<CorridorRow[]> {
  return query<CorridorRow>(
    `SELECT id, code, name, from_country, to_country, status, kill_switch,
            max_item_value_eur::float8 AS max_item_value_eur,
            max_parcel_weight_kg::float8 AS max_parcel_weight_kg,
            max_items_per_parcel, service_modes
       FROM corridors WHERE tenant_id = $1 ORDER BY status DESC, code`,
    [tenantId]
  );
}

export async function getCorridor(tenantId: string, id: string): Promise<CorridorRow | null> {
  return queryOne<CorridorRow>(
    `SELECT id, code, name, from_country, to_country, status, kill_switch,
            max_item_value_eur::float8 AS max_item_value_eur,
            max_parcel_weight_kg::float8 AS max_parcel_weight_kg,
            max_items_per_parcel, service_modes
       FROM corridors WHERE tenant_id = $1 AND id = $2`,
    [tenantId, id]
  );
}

export async function getCategoryMap(tenantId: string): Promise<Record<string, CategoryRule>> {
  const rows = await query<CategoryRule & { max_value_eur: string | null }>(
    `SELECT code, name, traveler_eligible, requires_review, prohibited, dangerous_goods,
            max_value_eur
       FROM categories WHERE tenant_id = $1`,
    [tenantId]
  );
  const map: Record<string, CategoryRule> = {};
  for (const r of rows) {
    map[r.code] = {
      code: r.code,
      name: r.name,
      traveler_eligible: r.traveler_eligible,
      requires_review: r.requires_review,
      prohibited: r.prohibited,
      dangerous_goods: r.dangerous_goods,
      max_value_eur: r.max_value_eur != null ? parseFloat(String(r.max_value_eur)) : null,
    };
  }
  return map;
}

export async function getCategoriesList(tenantId: string) {
  return query<CategoryRule & { description: string | null; sort_order: number; max_value_eur: string | null }>(
    `SELECT code, name, description, traveler_eligible, requires_review, prohibited,
            dangerous_goods, max_value_eur, sort_order
       FROM categories WHERE tenant_id = $1 ORDER BY sort_order, name`,
    [tenantId]
  );
}
