import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { query } from "@/db/client";
import { EmptyState } from "@/components/ui";
import { timeAgo, initials } from "@/lib/format";
import { getMessages } from "@/i18n";

export const metadata = { title: "Berichten" };

export default async function MessagesPage() {
  const user = await requireSession();
  const mg = (await getMessages()).msg;
  const convos = await query<any>(
    `SELECT c.id, c.subject, c.status, c.last_message_at, s.reference,
            (SELECT body FROM chat_messages m WHERE m.conversation_id=c.id ORDER BY m.created_at DESC LIMIT 1) AS last_body,
            (SELECT count(*) FROM chat_messages m
               WHERE m.conversation_id=c.id AND m.sender_id IS DISTINCT FROM $2
                 AND (p.last_read_at IS NULL OR m.created_at > p.last_read_at))::int AS unread,
            (SELECT string_agg(u.name, ', ') FROM conversation_participants pp
               JOIN users u ON u.id=pp.user_id WHERE pp.conversation_id=c.id AND pp.user_id<>$2) AS others
       FROM conversations c
       JOIN conversation_participants p ON p.conversation_id=c.id AND p.user_id=$2
       LEFT JOIN shipments s ON s.id=c.shipment_id
      WHERE c.tenant_id=$1
      ORDER BY c.last_message_at DESC NULLS LAST`,
    [user.tenantId, user.id]
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{mg.title}</h1>
        <p className="text-sm text-slate-500">{mg.sub}</p>
      </div>

      {convos.length === 0 ? (
        <EmptyState icon="💬" title={mg.none}>{mg.none_d}</EmptyState>
      ) : (
        <div className="ph-card divide-y divide-slate-100">
          {convos.map((c) => (
            <Link key={c.id} href={`/app/messages/${c.id}`} className="flex items-center gap-3 p-3 hover:bg-slate-50">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">
                {initials(c.others ?? "PH")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-slate-800">{c.others ?? c.subject}</span>
                  <span className="shrink-0 text-[11px] text-slate-400">{timeAgo(c.last_message_at)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm text-slate-500">{c.last_body ?? "—"}</span>
                  {c.unread > 0 && <span className="ph-chip shrink-0 bg-orange-500 text-white">{c.unread}</span>}
                </div>
                {c.reference && <span className="font-mono text-[11px] text-slate-400">{c.reference}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
