import type { Leg } from "@/lib/legs";
import { MODE_ICON } from "@/lib/legs";
import type { Messages } from "@/i18n/messages/nl";

const DOT: Record<string, string> = {
  COMPLETED: "bg-orange-500 border-orange-500",
  ARRIVED: "bg-orange-400 border-orange-400",
  IN_TRANSIT: "bg-amber-400 border-amber-400 animate-pulse",
  ASSIGNED: "bg-white border-orange-400",
  PLANNED: "bg-white border-slate-300",
  FAILED: "bg-rose-500 border-rose-500",
};
const STATUS_TONE: Record<string, string> = {
  COMPLETED: "text-orange-700 bg-orange-50",
  ARRIVED: "text-orange-700 bg-orange-50",
  IN_TRANSIT: "text-amber-700 bg-amber-50",
  ASSIGNED: "text-slate-600 bg-slate-100",
  PLANNED: "text-slate-500 bg-slate-50",
  FAILED: "text-rose-700 bg-rose-50",
};

export function RouteTimeline({ legs, t }: { legs: Leg[]; t: Messages["route"] }) {
  if (legs.length === 0) return <p className="text-sm text-slate-500">{t.none}</p>;
  const ltLabel = (k: string) => (t as Record<string, string>)[`lt_${k}`] ?? k;
  const stLabel = (k: string) => (t as Record<string, string>)[`st_${k}`] ?? k;

  return (
    <ol className="relative space-y-4">
      {legs.map((l, i) => (
        <li key={l.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className={`mt-1 h-3 w-3 shrink-0 rounded-full border-2 ${DOT[l.status] ?? DOT.PLANNED}`} />
            {i < legs.length - 1 && <span className="mt-1 w-px flex-1 bg-slate-200" />}
          </div>
          <div className="-mt-0.5 flex-1 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base leading-none">{MODE_ICON[l.mode] ?? "•"}</span>
              <span className="font-semibold text-slate-800">{ltLabel(l.leg_type)}</span>
              <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS_TONE[l.status] ?? STATUS_TONE.PLANNED}`}>
                {stLabel(l.status)}
              </span>
            </div>
            <div className="mt-0.5 text-sm text-slate-600">
              {l.from_label ?? "—"} <span className="text-slate-400">→</span> {l.to_label ?? "—"}
            </div>
            {l.manifest_ref && (
              <div className="mt-0.5 text-xs text-slate-400">
                {t.manifest}: <span className="font-mono">{l.manifest_ref}</span>
                {l.carrier_ref ? ` · ${l.carrier_ref}` : ""}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
