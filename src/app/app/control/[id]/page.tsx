import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import { query, queryOne } from "@/db/client";
import { EligibilityBadge, Chip, SectionTitle } from "@/components/ui";
import { eur, dateTimeNL } from "@/lib/format";
import { overrideEligibilityAction } from "../actions";
import { getMessages } from "@/i18n";

export const metadata = { title: "Beoordeling" };

const OPTION_KEYS = ["ALLOW", "REVIEW", "FREIGHT_ONLY", "HOLD", "REJECT"] as const;

export default async function ControlReview({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const user = await requireCapability("ops.review");
  const { id } = await params;
  const { error } = await searchParams;
  const L = (await getMessages()).ui_ctrl;

  const s = await queryOne<any>(
    `SELECT s.*, s.total_declared_value_eur::float8 AS value, u.name AS sender, u.kyc_status AS sender_kyc, c.name AS corridor
       FROM shipments s JOIN users u ON u.id=s.sender_id JOIN corridors c ON c.id=s.corridor_id
      WHERE s.id=$1 AND s.tenant_id=$2`,
    [id, user.tenantId]
  );
  if (!s) notFound();

  const items = await query<any>(
    `SELECT description, quantity, unit_value::float8 AS unit_value, category_code FROM shipment_items WHERE shipment_id=$1`, [id]
  );
  const decisions = await query<any>(
    `SELECT decision, reasons, rule_version, decided_by, created_at, (SELECT name FROM users u WHERE u.id=decided_by) AS by_name
       FROM eligibility_decisions WHERE shipment_id=$1 ORDER BY id DESC`, [id]
  );
  const latest = decisions[0];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/app/control" className="text-sm text-orange-600 hover:underline">{L.back}</Link>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="font-mono text-xl font-bold text-slate-900">{s.reference}</h1>
          <EligibilityBadge decision={s.eligibility} />
        </div>
        <p className="text-sm text-slate-500">{s.corridor} · {L.sender} {s.sender} ({s.sender_kyc}) · {eur(s.value)}</p>
      </div>

      {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>}

      <section className="ph-card p-4">
        <SectionTitle sub={L.items_sub}>{L.items}</SectionTitle>
        <ul className="divide-y divide-slate-100 text-sm">
          {items.map((it, i) => (
            <li key={i} className="flex justify-between py-1.5">
              <span>{it.quantity}× {it.description}</span>
              <span className="flex items-center gap-2 text-slate-500"><Chip>{it.category_code}</Chip>{eur(it.unit_value * it.quantity)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="ph-card p-4">
        <SectionTitle sub={`${L.reasons_sub} (${latest?.rule_version ?? "v1"})`}>{L.reasons}</SectionTitle>
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
          {(latest?.reasons ?? []).map((r: string, i: number) => <li key={i}>{r}</li>)}
        </ul>
      </section>

      <section className="ph-card p-4">
        <SectionTitle sub={L.decision_sub}>{L.decision}</SectionTitle>
        <form action={overrideEligibilityAction} className="space-y-3">
          <input type="hidden" name="shipment_id" value={s.id} />
          <div className="flex flex-wrap gap-2">
            {OPTION_KEYS.map((val) => (
              <label key={val} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50">
                <input type="radio" name="decision" value={val} defaultChecked={val === s.eligibility} />
                {(L as Record<string, string>)[`opt_${val}`]}
              </label>
            ))}
          </div>
          <textarea name="reason" rows={2} required minLength={5} placeholder={L.reason_ph}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
          <button className="ph-btn ph-btn-primary">{L.submit}</button>
        </form>
      </section>

      <section className="ph-card p-4">
        <SectionTitle>{L.history}</SectionTitle>
        <ol className="space-y-2 text-sm">
          {decisions.map((d, i) => (
            <li key={i} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
              <span><EligibilityBadge decision={d.decision} /> <span className="ml-1 text-xs text-slate-400">{d.rule_version}{d.by_name ? ` · ${d.by_name}` : " · auto"}</span></span>
              <span className="text-xs text-slate-400">{dateTimeNL(d.created_at)}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
