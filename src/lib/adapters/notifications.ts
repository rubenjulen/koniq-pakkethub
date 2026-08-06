import "server-only";
import { query } from "@/db/client";
import { PROVIDERS } from "./config";

/**
 * Notificatie-adapter. SIMULATED = 'PakketHub Notify (sandbox)': schrijft berichten naar een
 * outbox (tabel notifications) met status 'SENT', zodat je in testen precies ziet welke
 * WhatsApp/e-mail/push zou uitgaan. Echte livegang koppelt Twilio/WhatsApp Business/Resend
 * achter dezelfde send()-interface.
 */
export type Channel = "WHATSAPP" | "EMAIL" | "PUSH" | "SMS";

export async function notify(opts: {
  tenantId: string;
  userId?: string | null;
  channel?: Channel;
  template: string;
  title: string;
  body: string;
  meta?: Record<string, unknown>;
}) {
  const simulated = PROVIDERS.notifications.mode === "SIMULATED";
  await query(
    `INSERT INTO notifications (tenant_id, user_id, channel, template, title, body, status, provider, meta)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [opts.tenantId, opts.userId ?? null, opts.channel ?? "WHATSAPP", opts.template, opts.title, opts.body,
     simulated ? "SENT" : "QUEUED", PROVIDERS.notifications.name, JSON.stringify(opts.meta ?? {})]
  );
}
