"use client";
import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { track } from "@/lib/track";
import { evaluateEligibility, DECISION_LABEL, DECISION_TONE, type CategoryRule, type CorridorLimits } from "@/lib/eligibility";
import type { Messages } from "@/i18n/messages/nl";

type CatOpt = CategoryRule;
type Item = { id: number; description: string; value: number; category_code: string };

const TONE: Record<string, string> = {
  ok: "bg-orange-50 text-orange-800 ring-orange-200",
  warn: "bg-amber-50 text-amber-800 ring-amber-200",
  bad: "bg-rose-50 text-rose-800 ring-rose-200",
};

export function QuoteCalculator({
  categories, corridor, t, eligLabels,
}: {
  categories: CatOpt[];
  corridor: CorridorLimits & { name: string };
  t: Messages["send"];
  eligLabels: Messages["elig"];
}) {
  const [weight, setWeight] = useState("3");
  const [items, setItems] = useState<Item[]>([{ id: 1, description: "", value: 25, category_code: "CLOTHING" }]);

  // Meet één keer dat de gratis check daadwerkelijk gebruikt is (na eerste wijziging).
  const mounted = useRef(false);
  const fired = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    if (!fired.current) { fired.current = true; track("check_used"); }
  }, [weight, items]);

  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.code, c])), [categories]);

  const result = useMemo(() => evaluateEligibility({
    items: items.map((i) => ({ description: i.description || catMap[i.category_code]?.name || i.category_code, quantity: 1, unit_value: i.value, category_code: i.category_code })),
    isSealedClosed: false,
    declaredWeightKg: weight ? parseFloat(weight) : null,
    corridor,
    categories: catMap as Record<string, CategoryRule>,
    senderKycVerified: true,
  }), [items, weight, corridor, catMap]);

  const kg = parseFloat(weight) || 0;
  const low = Math.round((5 + kg * 5.5) * 100) / 100;
  const high = Math.round((8 + kg * 8) * 100) / 100;
  const tone = DECISION_TONE[result.decision];
  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500";
  const decisionLabel = (eligLabels as Record<string, string>)[result.decision] ?? DECISION_LABEL[result.decision];

  return (
    <div className="ph-card p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <span className="text-xs font-medium text-slate-600">{t.calc_corridor}</span>
          <div className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{corridor.name}</div>
        </div>
        <label className="block">
          <span className="text-xs font-medium text-slate-600">{t.calc_weight}</span>
          <input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" step="0.5" min="0" className={inp} />
        </label>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-800">{t.calc_content}</span>
          <button type="button" onClick={() => setItems((p) => [...p, { id: Math.max(0, ...p.map((i) => i.id)) + 1, description: "", value: 0, category_code: "CLOTHING" }])}
            className="ph-btn ph-btn-ghost text-xs">{t.add_item}</button>
        </div>
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="grid gap-2 sm:grid-cols-[1fr_90px_150px_32px] sm:items-center">
              <input value={it.description} onChange={(e) => setItems((p) => p.map((x) => x.id === it.id ? { ...x, description: e.target.value } : x))} placeholder={t.desc_opt} className={inp} />
              <input value={it.value} onChange={(e) => setItems((p) => p.map((x) => x.id === it.id ? { ...x, value: parseFloat(e.target.value) || 0 } : x))} type="number" min="0" title={t.value_t} className={inp} />
              <select value={it.category_code} onChange={(e) => setItems((p) => p.map((x) => x.id === it.id ? { ...x, category_code: e.target.value } : x))} className={inp}>
                {categories.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
              <button type="button" onClick={() => setItems((p) => p.length > 1 ? p.filter((x) => x.id !== it.id) : p)} className="text-slate-400 hover:text-rose-500">✕</button>
            </div>
          ))}
        </div>
      </div>

      <div className={`mt-4 rounded-xl p-4 ring-1 ${TONE[tone]}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold">
            {tone === "ok" ? "✓" : tone === "bad" ? "✕" : "!"} {decisionLabel}
          </span>
          {result.decision === "ALLOW" && (
            <span className="text-sm">{t.estimate} <strong>€{low} – €{high}</strong></span>
          )}
        </div>
        <ul className="mt-2 list-inside list-disc space-y-0.5 text-sm">
          {result.reasons.slice(0, 4).map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>

      <p className="mt-3 text-xs text-slate-500">{t.calc_note}</p>
      <div className="mt-4">
        <Link href="/login" className="ph-btn ph-btn-primary w-full sm:w-auto">{t.continue}</Link>
      </div>
    </div>
  );
}
