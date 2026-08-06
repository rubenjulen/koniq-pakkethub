"use client";
import { useMemo, useState } from "react";
import { evaluateEligibility, DECISION_LABEL, DECISION_TONE, type CategoryRule, type CorridorLimits } from "@/lib/eligibility";
import type { Messages } from "@/i18n/messages/nl";

type Corridor = CorridorLimits & { id: string; code: string; name: string };
type CatOpt = CategoryRule & { description?: string | null };
type Item = { id: number; description: string; quantity: number; unit_value: number; category_code: string };

const TONE_BANNER: Record<string, string> = {
  ok: "bg-orange-50 text-orange-800 ring-orange-200",
  warn: "bg-amber-50 text-amber-800 ring-amber-200",
  bad: "bg-rose-50 text-rose-800 ring-rose-200",
};

export function NewShipmentForm({
  corridors, categories, action, t, eligLabels,
}: {
  corridors: Corridor[];
  categories: CatOpt[];
  action: (fd: FormData) => void;
  t: Messages["newship"];
  eligLabels: Messages["elig"];
}) {
  const [corridorId, setCorridorId] = useState(corridors[0]?.id ?? "");
  const [sealed, setSealed] = useState(false);
  const [weight, setWeight] = useState<string>("");
  const [items, setItems] = useState<Item[]>([
    { id: 1, description: "", quantity: 1, unit_value: 0, category_code: "CLOTHING" },
  ]);

  const catMap = useMemo(() => {
    const m: Record<string, CategoryRule> = {};
    for (const c of categories) m[c.code] = c;
    return m;
  }, [categories]);

  const corridor = corridors.find((c) => c.id === corridorId) ?? corridors[0];

  const preview = useMemo(() => {
    if (!corridor) return null;
    return evaluateEligibility({
      items: items.filter((i) => i.description.trim() || i.unit_value > 0),
      isSealedClosed: sealed,
      declaredWeightKg: weight ? parseFloat(weight) : null,
      corridor,
      categories: catMap,
      senderKycVerified: true,
    });
  }, [items, sealed, weight, corridor, catMap]);

  function updateItem(id: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }
  function addItem() {
    setItems((prev) => [...prev, { id: Math.max(0, ...prev.map((i) => i.id)) + 1, description: "", quantity: 1, unit_value: 0, category_code: "CLOTHING" }]);
  }
  function removeItem(id: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== id) : prev));
  }

  const tone = preview ? DECISION_TONE[preview.decision] : "warn";
  const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500";

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="items" value={JSON.stringify(items.map(({ id, ...rest }) => rest))} />

      <section className="ph-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">{t.s1}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-slate-600">{t.corridor}</span>
            <select name="corridor_id" value={corridorId} onChange={(e) => setCorridorId(e.target.value)} className={inputCls}>
              {corridors.map((c) => (
                <option key={c.id} value={c.id} disabled={c.status === "PLANNED"}>
                  {c.name} {c.status !== "PILOT" && c.status !== "LIVE" ? `(${c.status})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">{t.recipient_name} *</span>
            <input name="recipient_name" required className={inputCls} placeholder={t.full_name} />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">{t.recipient_phone}</span>
            <input name="recipient_phone" className={inputCls} placeholder="+597 …" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">{t.recipient_city}</span>
            <input name="recipient_city" defaultValue="Paramaribo" className={inputCls} />
          </label>
        </div>
      </section>

      <section className="ph-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">{t.s2}</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block">
            <span className="text-xs font-medium text-slate-600">{t.weight}</span>
            <input name="declared_weight_kg" value={weight} onChange={(e) => setWeight(e.target.value)} type="number" step="0.1" min="0" className={inputCls} placeholder="3.5" />
          </label>
          <label className="block"><span className="text-xs font-medium text-slate-600">{t.length}</span><input name="length_cm" type="number" className={inputCls} /></label>
          <label className="block"><span className="text-xs font-medium text-slate-600">{t.width}</span><input name="width_cm" type="number" className={inputCls} /></label>
          <label className="block"><span className="text-xs font-medium text-slate-600">{t.height}</span><input name="height_cm" type="number" className={inputCls} /></label>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-slate-600">{t.deliver}</span>
            <select name="pickup_choice" className={inputCls} defaultValue="HUB_DROPOFF">
              <option value="HUB_DROPOFF">{t.dropoff}</option>
              <option value="HOME_PICKUP">{t.home}</option>
              <option value="MERCHANT">{t.merchant}</option>
              <option value="WAREHOUSE">{t.warehouse}</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">{t.deadline}</span>
            <input name="deadline" type="date" className={inputCls} />
          </label>
        </div>
        <label className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 p-3">
          <input type="checkbox" name="is_sealed_closed" checked={sealed} onChange={(e) => setSealed(e.target.checked)} className="mt-0.5" />
          <span className="text-sm text-slate-700">
            {t.sealed_label}
            <span className="block text-xs text-slate-500">{t.sealed_note}</span>
          </span>
        </label>
      </section>

      <section className="ph-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">{t.s3}</h2>
          <button type="button" onClick={addItem} className="ph-btn ph-btn-ghost text-xs">{t.add_item}</button>
        </div>
        <div className="space-y-2">
          {items.map((it) => {
            const cat = catMap[it.category_code];
            const badge: [string, string] | null = !cat ? null
              : cat.prohibited ? ["bad", t.b_prohibited]
              : cat.dangerous_goods ? ["warn", t.b_dangerous]
              : !cat.traveler_eligible ? ["warn", cat.requires_review ? t.b_review : t.b_freight]
              : cat.requires_review ? ["warn", t.b_check]
              : ["ok", t.b_listed];
            return (
              <div key={it.id} className="rounded-lg border border-slate-200 p-2">
                <div className="grid gap-2 sm:grid-cols-[1fr_70px_90px_150px_32px] sm:items-center">
                  <input value={it.description} onChange={(e) => updateItem(it.id, { description: e.target.value })} placeholder={t.desc} className={inputCls} />
                  <input value={it.quantity} onChange={(e) => updateItem(it.id, { quantity: parseInt(e.target.value) || 1 })} type="number" min="1" className={inputCls} title={t.qty_t} />
                  <input value={it.unit_value} onChange={(e) => updateItem(it.id, { unit_value: parseFloat(e.target.value) || 0 })} type="number" min="0" step="0.01" className={inputCls} title={t.val_t} />
                  <select value={it.category_code} onChange={(e) => updateItem(it.id, { category_code: e.target.value })} className={inputCls}>
                    {categories.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                  <button type="button" onClick={() => removeItem(it.id)} className="text-slate-400 hover:text-rose-500" title={t.remove}>✕</button>
                </div>
                {badge && (
                  <div className="mt-1 pl-1">
                    <span className={`ph-chip ${badge[0] === "ok" ? "bg-orange-50 text-orange-700" : badge[0] === "bad" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{badge[1]}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <label className="mt-3 block">
          <span className="text-xs font-medium text-slate-600">{t.note_opt}</span>
          <textarea name="notes" rows={2} className={inputCls} placeholder={t.note_ph} />
        </label>
      </section>

      {preview && (
        <div className={`rounded-xl p-4 ring-1 ${TONE_BANNER[tone]}`}>
          <div className="flex items-center justify-between">
            <div className="font-semibold">{t.preview_prefix} {(eligLabels as Record<string, string>)[preview.decision] ?? DECISION_LABEL[preview.decision]}</div>
            <div className="text-sm">{t.value} €{preview.totalValueEur} · {preview.totalItems} {t.pieces}</div>
          </div>
          <ul className="mt-2 list-inside list-disc space-y-0.5 text-sm">
            {preview.reasons.slice(0, 5).map((r, i) => <li key={i}>{r}</li>)}
          </ul>
          <p className="mt-2 text-xs opacity-70">{t.preview_note}</p>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <a href="/app/shipments" className="ph-btn ph-btn-ghost">{t.cancel}</a>
        <button type="submit" className="ph-btn ph-btn-primary">{t.create}</button>
      </div>
    </form>
  );
}
