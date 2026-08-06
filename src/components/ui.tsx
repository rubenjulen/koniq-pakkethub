import type { Decision } from "@/lib/eligibility";
import { DECISION_LABEL, DECISION_TONE } from "@/lib/eligibility";
import { SHIPMENT_STATUS_LABEL } from "@/lib/format";

const TONE_CLASS: Record<string, string> = {
  ok: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  warn: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  bad: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  neutral: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
};

export function Chip({ tone = "neutral", children }: { tone?: keyof typeof TONE_CLASS; children: React.ReactNode }) {
  return <span className={`ph-chip ${TONE_CLASS[tone]}`}>{children}</span>;
}

export function EligibilityBadge({ decision }: { decision: Decision | string }) {
  const d = decision as Decision;
  const tone = DECISION_TONE[d] ?? "neutral";
  const label = DECISION_LABEL[d] ?? decision;
  const icon = tone === "ok" ? "✓" : tone === "bad" ? "✕" : "!";
  return <Chip tone={tone}>{icon} {label}</Chip>;
}

export function StatusBadge({ status }: { status: string }) {
  const label = SHIPMENT_STATUS_LABEL[status] ?? status;
  const tone: keyof typeof TONE_CLASS =
    status === "DELIVERED" || status === "CLOSED" ? "ok" :
    status === "RETURNED" ? "bad" :
    status === "DRAFT" ? "neutral" : "warn";
  return <Chip tone={tone}>{label}</Chip>;
}

export function KycBadge({ status }: { status: string }) {
  const map: Record<string, [keyof typeof TONE_CLASS, string]> = {
    VERIFIED: ["ok", "✓ Geverifieerd"],
    PENDING: ["warn", "Verificatie loopt"],
    UNVERIFIED: ["warn", "Niet geverifieerd"],
    REJECTED: ["bad", "Afgewezen"],
  };
  const [tone, label] = map[status] ?? ["neutral", status];
  return <Chip tone={tone}>{label}</Chip>;
}

export function StatCard({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="ph-card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function EmptyState({ icon = "📭", title, children }: { icon?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="ph-card flex flex-col items-center gap-2 p-10 text-center">
      <div className="text-3xl">{icon}</div>
      <div className="font-semibold text-slate-800">{title}</div>
      {children && <div className="max-w-sm text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-semibold text-slate-900">{children}</h2>
      {sub && <p className="text-sm text-slate-500">{sub}</p>}
    </div>
  );
}
