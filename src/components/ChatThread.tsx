"use client";
import { useCallback, useEffect, useRef, useState } from "react";

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
  conversationId, currentUserId, initialMessages, locked,
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages: Msg[];
  locked: boolean;
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

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");
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

  return (
    <div className="ph-card flex h-[70vh] flex-col">
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
        <ProposeForm conversationId={conversationId} onDone={async () => { setShowPropose(false); await poll(); }} />
      )}

      {/* Composer */}
      {locked ? (
        <div className="border-t border-slate-100 p-3 text-center text-sm text-slate-400">Dit gesprek is gesloten.</div>
      ) : (
        <div className="border-t border-slate-100 p-3">
          <div className="flex items-end gap-2">
            <button onClick={() => setShowPropose((v) => !v)} title="Afspraak voorstellen"
              className="ph-btn ph-btn-ghost shrink-0 px-3">🤝</button>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder="Typ een bericht…  (Enter = versturen)"
              className="max-h-32 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
            <button onClick={send} disabled={sending || !text.trim()} className="ph-btn ph-btn-primary shrink-0 disabled:opacity-40">Stuur</button>
          </div>
        </div>
      )}
    </div>
  );
}

function AgreementCard({ status, terms, canRespond, onRespond, mine }: {
  status: string; terms: Record<string, any>; canRespond: boolean; mine: boolean;
  onRespond: (a: "accept" | "decline") => void;
}) {
  const tone = status === "ACCEPTED" ? "bg-orange-50 text-orange-800 ring-orange-300"
    : status === "DECLINED" ? "bg-rose-50 text-rose-800 ring-rose-300"
    : mine ? "bg-white/15 text-white ring-white/30" : "bg-white text-slate-700 ring-slate-200";
  const label = status === "ACCEPTED" ? "Bevestigd" : status === "DECLINED" ? "Afgewezen" : "Voorstel";
  return (
    <div className={`mt-2 rounded-xl p-2 text-xs ring-1 ${tone}`}>
      <div className="mb-1 font-semibold">🤝 Afspraak · {label}</div>
      <ul className="space-y-0.5">
        {terms.handover_place && <li>📍 {terms.handover_place}</li>}
        {terms.handover_time && <li>🕒 {terms.handover_time}</li>}
        {terms.price_eur != null && <li>💶 €{terms.price_eur}</li>}
        {terms.note && <li className="opacity-80">{terms.note}</li>}
      </ul>
      {canRespond && (
        <div className="mt-2 flex gap-2">
          <button onClick={() => onRespond("accept")} className="rounded-lg bg-orange-600 px-2 py-1 font-semibold text-white">Bevestigen</button>
          <button onClick={() => onRespond("decline")} className="rounded-lg bg-slate-200 px-2 py-1 font-semibold text-slate-700">Afwijzen</button>
        </div>
      )}
    </div>
  );
}

function ProposeForm({ conversationId, onDone }: { conversationId: string; onDone: () => void }) {
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
      <div className="mb-2 text-xs font-semibold text-slate-600">Afspraak voorstellen</div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Plaats (bijv. Hub Amsterdam)" className={inp} />
        <input value={time} onChange={(e) => setTime(e.target.value)} placeholder="Tijd (bijv. di 14:00)" className={inp} />
        <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" step="0.5" placeholder="Prijs €" className={inp} />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notitie" className={inp} />
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button onClick={onDone} className="ph-btn ph-btn-ghost text-xs">Annuleren</button>
        <button onClick={submit} disabled={busy} className="ph-btn ph-btn-primary text-xs">Voorstel sturen</button>
      </div>
    </div>
  );
}
