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

/**
 * Vindt of maakt een direct 1-op-1 gesprek tussen twee leden (los van een zending,
 * eventueel in de context van een route/trip). Gebruikt door de 'Chat'-knoppen op
 * route-/verzoek-kaarten en profielen.
 */
export async function startDirectConversation(opts: {
  tenantId: string; meId: string; otherId: string; tripId?: string | null; subject?: string | null;
}): Promise<string> {
  const { tenantId, meId, otherId } = opts;
  const existing = await queryOne<{ id: string }>(
    `SELECT c.id FROM conversations c
      WHERE c.tenant_id=$1 AND c.shipment_id IS NULL
        AND EXISTS (SELECT 1 FROM conversation_participants p WHERE p.conversation_id=c.id AND p.user_id=$2)
        AND EXISTS (SELECT 1 FROM conversation_participants p WHERE p.conversation_id=c.id AND p.user_id=$3)
        AND (SELECT count(*) FROM conversation_participants p WHERE p.conversation_id=c.id) = 2
      ORDER BY c.created_at DESC LIMIT 1`,
    [tenantId, meId, otherId]
  );
  if (existing) return existing.id;

  const conv = await queryOne<{ id: string }>(
    `INSERT INTO conversations (tenant_id, trip_id, subject, status, last_message_at)
     VALUES ($1,$2,$3,'OPEN', now()) RETURNING id`,
    [tenantId, opts.tripId ?? null, opts.subject ?? null]
  );
  const id = conv!.id;
  await query(
    `INSERT INTO conversation_participants (conversation_id, user_id, party_role)
     VALUES ($1,$2,'MEMBER'),($1,$3,'MEMBER')`,
    [id, meId, otherId]
  );
  await query(
    `INSERT INTO chat_messages (tenant_id, conversation_id, sender_id, kind, body)
     VALUES ($1,$2,NULL,'SYSTEM',$3)`,
    [tenantId, id, "Gesprek gestart — overleg hier en leg afspraken vast."]
  );
  return id;
}
