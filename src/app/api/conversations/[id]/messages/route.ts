import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertParticipant, fetchMessages, markRead } from "@/lib/chat";
import { postMessage } from "@/lib/shipments";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user?.tenantId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const ctx = await assertParticipant(id, user.id, user.tenantId);
  if (!ctx) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const after = url.searchParams.get("after") ?? undefined;
  const messages = await fetchMessages(id, after);
  // Bij ophalen markeren we het gesprek als gelezen.
  await markRead(id, user.id);
  return NextResponse.json({ messages, now: new Date().toISOString() });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user?.tenantId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const ctx = await assertParticipant(id, user.id, user.tenantId);
  if (!ctx) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (ctx.status !== "OPEN") return NextResponse.json({ error: "conversation_closed" }, { status: 409 });

  const { body } = await req.json().catch(() => ({ body: "" }));
  const text = String(body ?? "").trim();
  if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });
  if (text.length > 4000) return NextResponse.json({ error: "too_long" }, { status: 400 });

  await postMessage({ tenantId: user.tenantId, conversationId: id, senderId: user.id, kind: "TEXT", body: text });
  await markRead(id, user.id);
  return NextResponse.json({ ok: true });
}
