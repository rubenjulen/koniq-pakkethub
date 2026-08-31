"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { submitFeedbackAction } from "@/app/app/feedback/actions";
import type { Messages } from "@/i18n/messages/nl";

/**
 * Zwevende feedback-knop voor de testfase. Slaat feedback in-app op (Control
 * Center) via een server action, met de huidige pagina als context.
 * Optioneel een WhatsApp-snelkoppeling wanneer een nummer is ingesteld.
 */
export function FeedbackWidget({ t, whatsapp }: { t: Messages["fb"]; whatsapp?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("fb");
    if (q === "sent") {
      setThanks(true);
      window.history.replaceState(null, "", window.location.pathname);
      const tm = setTimeout(() => setThanks(false), 4500);
      return () => clearTimeout(tm);
    }
  }, []);

  const wa = whatsapp
    ? `https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`[BugaWuga test] ${pathname}\n`)}`
    : null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-30 flex items-center gap-2 rounded-full bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg ring-1 ring-black/5 hover:bg-orange-700 lg:bottom-6"
        >
          💬 {t.button}
        </button>
      )}

      {thanks && (
        <div className="fixed bottom-20 right-4 z-40 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg lg:bottom-6">
          ✓ {t.sent}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="relative m-3 w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-1 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">{t.title}</h2>
                <p className="text-xs text-slate-500">{t.sub}</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label={t.close} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100">✕</button>
            </div>

            <form action={submitFeedbackAction} className="mt-3 space-y-3">
              <input type="hidden" name="page" value={pathname} />
              <label className="block">
                <span className="text-xs font-medium text-slate-600">{t.cat_label}</span>
                <select name="category" defaultValue="BUG" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="BUG">🐞 {t.cat_bug}</option>
                  <option value="IDEA">💡 {t.cat_idea}</option>
                  <option value="QUESTION">❓ {t.cat_question}</option>
                  <option value="OTHER">💬 {t.cat_other}</option>
                </select>
              </label>
              <textarea
                name="message" required rows={4} autoFocus placeholder={t.placeholder}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
              <div className="flex items-center justify-between gap-2">
                {wa ? (
                  <a href={wa} target="_blank" rel="noopener" className="text-xs font-medium text-orange-600 hover:underline">{t.whatsapp} →</a>
                ) : <span />}
                <button className="ph-btn ph-btn-primary text-sm">{t.send}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
