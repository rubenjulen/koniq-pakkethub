"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Messages } from "@/i18n/messages/nl";

type ChatT = Messages["chat"];

type Msg = {
  id: string;
  sender_id: string | null;
  sender_name: string | null;
  kind: string;
  body: string;
  meta: Record<string, any>;
  created_at: string;
  agreement_id: string | null;
  agreement_status: string | null;
  agreement_terms: Record<string, any> | null;
  agreement_proposed_by: string | null;
};

function timeShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

export function ChatThread({
  conversationId, currentUserId, initialMessages, locked, t,
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages: Msg[];
  locked: boolean;
  t: ChatT;
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showPropose, setShowPropose] = useState(false);
  const lastTs = useRef<string>(initialMessages.at(-1)?.created_at ?? new Date(0).toISOString());
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollBox = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Poll voor nieuwe berichten (near-real-time zonder websockets).
  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages?after=${encodeURIComponent(lastTs.current)}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.messages?.length) {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const fresh = data.messages.filter((m: Msg) => !ids.has(m.id));
          if (!fresh.length) return prev;
          lastTs.current = fresh.at(-1).created_at;
          return [...prev, ...fresh];
        });
      }
    } catch { /* stil */ }
  }, [conversationId]);

  // Ververs ook de agreement-status van bestaande berichten (accept/decline).
  const refreshAll = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
        lastTs.current = data.messages.at(-1)?.created_at ?? lastTs.current;
      }
    } catch { /* stil */ }
  }, [conversationId]);

  useEffect(() => {
    const iv = setInterval(poll, 3500);
    return () => clearInterval(iv);
  }, [poll]);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  async function send(override?: string) {
    const body = (override ?? text).trim();
    if (!body || sending) return;
    setSending(true);
    if (!override) setText("");
    // Optimistisch tonen.
    const optimistic: Msg = {
      id: "tmp-" + Date.now(), sender_id: currentUserId, sender_name: "Jij", kind: "TEXT",
      body, meta: {}, created_at: new Date().toISOString(),
      agreement_id: null, agreement_status: null, agreement_terms: null, agreement_proposed_by: null,
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }),
      });
      await poll();
    } finally {
      setSending(false);
    }
  }

  async function respondAgreement(aid: string, action: "accept" | "decline") {
    await fetch(`/api/conversations/${conversationId}/agreements/${aid}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
    });
    await refreshAll();
  }

  // Laatste bevestigde afspraak als houvast bovenaan vastpinnen.
  const pinned = [...messages].reverse().find((mm) => mm.agreement_status === "ACCEPTED" && mm.agreement_terms)?.agreement_terms ?? null;

  return (
    <div className="ph-card flex h-[70vh] flex-col">
      {/* Vastgepinde afspraak (houvast) */}
      {pinned && (
        <div className="rounded-t-[14px] border-b border-orange-200 bg-orange-50 px-4 py-2 text-xs text-orange-800">
          <div className="mb-0.5 font-semibold">📌 {t.agreement_pin}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            {pinned.handover_place && <span>📍 {pinned.handover_place}</span>}
            {pinned.handover_time && <span>🕒 {pinned.handover_time}</span>}
            {pinned.price_eur != null && <span>💶 €{pinned.price_eur}</span>}
            {pinned.note && <span className="opacity-80">{pinned.note}</span>}
          </div>
        </div>
      )}

      {/* Berichten */}
      <div ref={scrollBox} className="ph-scroll flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => {
          if (m.kind === "SYSTEM") {
            return (
              <div key={m.id} className="ph-fade mx-auto max-w-md rounded-full bg-slate-100 px-3 py-1 text-center text-xs text-slate-500">
                {m.body}
              </div>
            );
          }
          const mine = m.sender_id === currentUserId;
          const isProposal = m.kind === "PROPOSAL" && m.agreement_id;
          return (
            <div key={m.id} className={`ph-fade flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-800"}`}>
                {!mine && <div className="mb-0.5 text-[11px] font-semibold opacity-70">{m.sender_name}</div>}
                <div className="whitespace-pre-wrap">{m.body}</div>

                {isProposal && m.agreement_terms && (
                  <AgreementCard
                    mine={mine}
                    status={m.agreement_status ?? "PROPOSED"}
                    terms={m.agreement_terms}
                    canRespond={!mine && m.agreement_status === "PROPOSED"}
                    onRespond={(a) => respondAgreement(m.agreement_id!, a)}
                    t={t}
                  />
                )}
                <div className={`mt-1 text-right text-[10px] ${mine ? "text-orange-100" : "text-slate-400"}`}>{timeShort(m.created_at)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Afspraak-voorstel */}
      {showPropose && !locked && (
        <ProposeForm conversationId={conversationId} onDone={async () => { setShowPropose(false); await poll(); }} t={t} />
      )}

      {/* Composer */}
      {locked ? (
        <div className="border-t border-slate-100 p-3 text-center text-sm text-slate-400">{t.closed}</div>
      ) : (
        <div className="border-t border-slate-100 p-3">
          {/* Handige standaardvragen (common practice) */}
          {t.quick?.length > 0 && (
            <div className="ph-scroll mb-2 flex gap-1.5 overflow-x-auto pb-1">
              {t.quick.map((q, i) => (
                <button key={i} onClick={() => send(q)} disabled={sending}
                  className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 disabled:opacity-40">{q}</button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <button onClick={() => setShowPropose((v) => !v)} title={t.propose}
              className="ph-btn ph-btn-ghost shrink-0 px-3">🤝</button>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder={t.type_msg}
              className="max-h-32 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
            <button onClick={() => send()} disabled={sending || !text.trim()} className="ph-btn ph-btn-primary shrink-0 disabled:opacity-40">{t.send}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function AgreementCard({ status, terms, canRespond, onRespond, mine, t }: {
  status: string; terms: Record<string, any>; canRespond: boolean; mine: boolean;
  onRespond: (a: "accept" | "decline") => void; t: ChatT;
}) {
  const tone = status === "ACCEPTED" ? "bg-orange-50 text-orange-800 ring-orange-300"
    : status === "DECLINED" ? "bg-rose-50 text-rose-800 ring-rose-300"
    : mine ? "bg-white/15 text-white ring-white/30" : "bg-white text-slate-700 ring-slate-200";
  const label = status === "ACCEPTED" ? t.ag_confirmed : status === "DECLINED" ? t.ag_declined : t.ag_proposal;
  return (
    <div className={`mt-2 rounded-xl p-2 text-xs ring-1 ${tone}`}>
      <div className="mb-1 font-semibold">🤝 {t.ag_title} · {label}</div>
      <ul className="space-y-0.5">
        {terms.handover_place && <li>📍 {terms.handover_place}</li>}
        {terms.handover_time && <li>🕒 {terms.handover_time}</li>}
        {terms.price_eur != null && <li>💶 €{terms.price_eur}</li>}
        {terms.note && <li className="opacity-80">{terms.note}</li>}
      </ul>
      {canRespond && (
        <div className="mt-2 flex gap-2">
          <button onClick={() => onRespond("accept")} className="rounded-lg bg-orange-600 px-2 py-1 font-semibold text-white">{t.confirm}</button>
          <button onClick={() => onRespond("decline")} className="rounded-lg bg-slate-200 px-2 py-1 font-semibold text-slate-700">{t.decline}</button>
        </div>
      )}
    </div>
  );
}

function ProposeForm({ conversationId, onDone, t }: { conversationId: string; onDone: () => void; t: ChatT }) {
  const [place, setPlace] = useState("");
  const [time, setTime] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const inp = "w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-orange-500";

  async function submit() {
    if (busy) return;
    setBusy(true);
    await fetch(`/api/conversations/${conversationId}/agreements`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handover_place: place, handover_time: time, price_eur: price || null, note }),
    });
    setBusy(false);
    onDone();
  }

  return (
    <div className="border-t border-slate-100 bg-slate-50 p-3">
      <div className="mb-2 text-xs font-semibold text-slate-600">{t.propose}</div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder={t.place_ph} className={inp} />
        <input value={time} onChange={(e) => setTime(e.target.value)} placeholder={t.time_ph} className={inp} />
        <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" step="0.5" placeholder={t.price_ph} className={inp} />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.note_ph} className={inp} />
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button onClick={onDone} className="ph-btn ph-btn-ghost text-xs">{t.cancel}</button>
        <button onClick={submit} disabled={busy} className="ph-btn ph-btn-primary text-xs">{t.send_proposal}</button>
      </div>
    </div>
  );
}
