import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query, queryOne } from "@/db/client";
import { assertParticipant } from "@/lib/chat";
import { postMessage } from "@/lib/shipments";
import { audit } from "@/lib/audit";

/** Stelt een overdracht-afspraak voor (plaats, tijd, prijs) en post die als kaart in de chat. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user?.tenantId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const ctx = await assertParticipant(id, user.id, user.tenantId);
  if (!ctx) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const terms = {
    handover_place: String(b.handover_place ?? "").trim(),
    handover_time: String(b.handover_time ?? "").trim(),
    price_eur: b.price_eur != null && b.price_eur !== "" ? Number(b.price_eur) : null,
    note: String(b.note ?? "").trim(),
  };
  if (!terms.handover_place && !terms.handover_time && terms.price_eur == null) {
    return NextResponse.json({ error: "empty" }, { status: 400 });
  }

  const agreement = await queryOne<{ id: string }>(
    `INSERT INTO agreements (tenant_id, conversation_id, shipment_id, proposed_by, terms, status)
     VALUES ($1,$2,$3,$4,$5,'PROPOSED') RETURNING id`,
    [user.tenantId, id, ctx.shipment_id, user.id, JSON.stringify(terms)]
  );

  const parts = [
    terms.handover_place && `📍 ${terms.handover_place}`,
    terms.handover_time && `🕒 ${terms.handover_time}`,
    terms.price_eur != null && `💶 €${terms.price_eur}`,
  ].filter(Boolean).join(" · ");

  await postMessage({
    tenantId: user.tenantId, conversationId: id, senderId: user.id, kind: "PROPOSAL",
    body: `${user.firstName} stelt een afspraak voor: ${parts}${terms.note ? ` — ${terms.note}` : ""}`,
    meta: { agreementId: agreement!.id },
  });
  await audit({ tenantId: user.tenantId, userId: user.id, action: "AGREEMENT_PROPOSE", entityType: "conversation", entityId: id, summary: parts });
  return NextResponse.json({ ok: true, agreementId: agreement!.id });
}
