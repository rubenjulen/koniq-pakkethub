import "server-only";
import { query, queryOne } from "@/db/client";

/** Controleert dat de gebruiker deelnemer is van het gesprek. Geeft context terug. */
export async function assertParticipant(conversationId: string, userId: string, tenantId: string) {
  const row = await queryOne<{ shipment_id: string | null; party_role: string; status: string }>(
    `SELECT c.shipment_id, c.status, p.party_role
       FROM conversations c
       JOIN conversation_participants p ON p.conversation_id = c.id AND p.user_id = $2
      WHERE c.id = $1 AND c.tenant_id = $3`,
    [conversationId, userId, tenantId]
  );
  return row;
}

/** Haalt berichten op (optioneel alleen na een tijdstip), met agreement-status. */
export async function fetchMessages(conversationId: string, afterIso?: string) {
  const params: unknown[] = [conversationId];
  let where = `m.conversation_id = $1`;
  if (afterIso) {
    params.push(afterIso);
    where += ` AND m.created_at > $2`;
  }
  return query<any>(
    `SELECT m.id, m.sender_id, m.kind, m.body, m.meta, m.created_at,
            u.name AS sender_name,
            a.id AS agreement_id, a.status AS agreement_status, a.terms AS agreement_terms,
            a.proposed_by AS agreement_proposed_by
       FROM chat_messages m
       LEFT JOIN users u ON u.id = m.sender_id
       LEFT JOIN agreements a ON a.id = (m.meta->>'agreementId')::uuid
      WHERE ${where}
      ORDER BY m.created_at ASC`,
    params
  );
}

export async function markRead(conversationId: string, userId: string) {
  await query(
    `UPDATE conversation_participants SET last_read_at = now() WHERE conversation_id=$1 AND user_id=$2`,
    [conversationId, userId]
  );
}
