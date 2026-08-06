import { requireSession } from "@/lib/auth";
import { query } from "@/db/client";
import { EmptyState, Chip } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import { getMessages } from "@/i18n";

export const metadata = { title: "Notificaties" };

const CH_ICON: Record<string, string> = { WHATSAPP: "🟢", EMAIL: "✉️", PUSH: "🔔", SMS: "💬" };

export default async function NotificationsPage() {
  const user = await requireSession();
  const t = (await getMessages()).notif;
  const rows = await query<any>(
    `SELECT channel, template, title, body, status, provider, created_at
       FROM notifications WHERE tenant_id=$1 AND (user_id=$2 OR user_id IS NULL)
      ORDER BY created_at DESC LIMIT 50`,
    [user.tenantId, user.id]
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t.title}</h1>
        <p className="text-sm text-slate-500">{t.sub}</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="🔕" title={t.empty} />
      ) : (
        <div className="ph-card divide-y divide-slate-100">
          {rows.map((n, i) => (
            <div key={i} className="flex gap-3 p-3">
              <div className="text-xl">{CH_ICON[n.channel] ?? "🔔"}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800">{n.title}</span>
                  <span className="shrink-0 text-[11px] text-slate-400">{timeAgo(n.created_at)}</span>
                </div>
                <p className="text-sm text-slate-600">{n.body}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Chip tone={n.status === "SENT" ? "ok" : "warn"}>{n.channel} · {n.status}</Chip>
                  <span className="text-[11px] text-slate-400">{n.provider}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
