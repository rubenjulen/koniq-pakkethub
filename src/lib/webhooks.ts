import "server-only";
import { createHmac } from "node:crypto";
import { query } from "@/db/client";

/**
 * Webhook-simulator. Voor elke actieve webhook die op dit event geabonneerd is, wordt een
 * delivery vastgelegd (met HMAC-signature) in webhook_deliveries. In SIMULATED-modus doen we
 * geen echte HTTP-call; je ziet in de Business/API-console precies wat verstuurd zou worden.
 * Echte livegang doet hier een fetch() naar de endpoint met retry/backoff.
 */
export async function fireWebhooks(tenantId: string, event: string, payload: Record<string, unknown>) {
  const hooks = await query<any>(
    `SELECT id, url, secret FROM webhooks WHERE tenant_id=$1 AND active=true AND $2 = ANY(events)`,
    [tenantId, event]
  );
  for (const h of hooks) {
    const body = JSON.stringify({ event, data: payload, sent_at: new Date().toISOString() });
    const signature = createHmac("sha256", h.secret).update(body).digest("hex");
    await query(
      `INSERT INTO webhook_deliveries (tenant_id, webhook_id, event, payload, status, response_code)
       VALUES ($1,$2,$3,$4,'SENT',200)`,
      [tenantId, h.id, event, JSON.stringify({ event, data: payload, signature })]
    );
  }
}
