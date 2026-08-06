import "server-only";
import { query } from "@/db/client";

export async function audit(entry: {
  tenantId: string | null;
  userId: string | null;
  action: string;
  entityType?: string;
  entityId?: string | null;
  summary?: string;
  meta?: Record<string, unknown>;
}) {
  await query(
    `INSERT INTO audit_log (tenant_id, user_id, action, entity_type, entity_id, summary, meta)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      entry.tenantId,
      entry.userId,
      entry.action,
      entry.entityType ?? null,
      entry.entityId ?? null,
      entry.summary ?? null,
      JSON.stringify(entry.meta ?? {}),
    ]
  );
}
