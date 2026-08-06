import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { queryOne } from "@/db/client";
import { assertParticipant, fetchMessages, markRead } from "@/lib/chat";
import { ChatThread } from "@/components/ChatThread";
import { StatusBadge } from "@/components/ui";

export const metadata = { title: "Gesprek" };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSession();
  const { id } = await params;

  const ctx = await assertParticipant(id, user.id, user.tenantId);
  if (!ctx) notFound();

  const meta = await queryOne<any>(
    `SELECT c.subject, c.status AS conv_status, s.id AS shipment_id, s.reference, s.status AS shipment_status,
            (SELECT string_agg(u.name, ', ') FROM conversation_participants pp
               JOIN users u ON u.id=pp.user_id WHERE pp.conversation_id=c.id AND pp.user_id<>$2) AS others
       FROM conversations c LEFT JOIN shipments s ON s.id=c.shipment_id WHERE c.id=$1`,
    [id, user.id]
  );
  const messages = await fetchMessages(id);
  await markRead(id, user.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <Link href="/app/messages" className="text-sm text-orange-600 hover:underline">← Berichten</Link>
          <h1 className="truncate text-lg font-bold text-slate-900">{meta?.others ?? meta?.subject ?? "Gesprek"}</h1>
        </div>
        {meta?.shipment_id && (
          <Link href={`/app/shipments/${meta.shipment_id}`} className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs hover:bg-slate-100">
            <span className="font-mono font-semibold text-slate-700">{meta.reference}</span>
            <StatusBadge status={meta.shipment_status} />
          </Link>
        )}
      </div>

      <ChatThread
        conversationId={id}
        currentUserId={user.id}
        initialMessages={messages}
        locked={meta?.conv_status !== "OPEN"}
      />
    </div>
  );
}
