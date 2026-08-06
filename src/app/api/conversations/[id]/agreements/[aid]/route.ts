import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query, queryOne } from "@/db/client";
import { assertParticipant } from "@/lib/chat";
import { postMessage } from "@/lib/shipments";
import { audit } from "@/lib/audit";

/** Accepteren of afwijzen van een voorgestelde afspraak (door de tegenpartij). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string; aid: string }> }) {
  const user = await getSession();
  if (!user?.tenantId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id, aid } = await params;
  const ctx = await assertParticipant(id, user.id, user.tenantId);
  if (!ctx) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { action } = await req.json().catch(() => ({}));
  if (action !== "accept" && action !== "decline") return NextResponse.json({ error: "bad_action" }, { status: 400 });

  const ag = await queryOne<any>(
    `SELECT id, proposed_by, status, terms FROM agreements WHERE id=$1 AND conversation_id=$2`, [aid, id]
  );
  if (!ag) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (ag.status !== "PROPOSED") return NextResponse.json({ error: "already_resolved" }, { status: 409 });
  // Alleen de tegenpartij (niet de voorsteller) mag reageren.
  if (ag.proposed_by === user.id) return NextResponse.json({ error: "cannot_respond_own" }, { status: 403 });

  const newStatus = action === "accept" ? "ACCEPTED" : "DECLINED";
  await query(
    `UPDATE agreements SET status=$1, accepted_by=$2, accepted_at=now() WHERE id=$3`,
    [newStatus, user.id, aid]
  );
  await postMessage({
    tenantId: user.tenantId, conversationId: id, senderId: null, kind: "SYSTEM",
    body: action === "accept"
      ? `✅ ${user.firstName} heeft de afspraak bevestigd.`
      : `❌ ${user.firstName} heeft de afspraak afgewezen.`,
  });
  await audit({ tenantId: user.tenantId, userId: user.id, action: `AGREEMENT_${newStatus}`, entityType: "agreement", entityId: aid });
  return NextResponse.json({ ok: true, status: newStatus });
}
