import { getTenantId } from "@/lib/tenant";
import { query, queryOne } from "@/db/client";
import { SHIPMENT_STATUS_LABEL, dateTimeNL } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Track & trace" };

// Publieke, beperkte tracking op referentie. Geen persoons- of inhoudsgegevens.
const PUBLIC_STEPS = ["CREATED", "SCREENED", "INTAKE", "SEALED", "HANDOVER", "DEPARTED", "CUSTOMS", "ARRIVED", "DELIVERED"];
const STEP_LABEL: Record<string, string> = {
  CREATED: "Aangemaakt", SCREENED: "Gecontroleerd", INTAKE: "Ingenomen bij hub", SEALED: "Verzegeld",
  HANDOVER: "Overgedragen", DEPARTED: "Vertrokken", CUSTOMS: "Douane", ARRIVED: "Aangekomen", DELIVERED: "Afgeleverd",
};

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  const tenantId = await getTenantId();

  let shipment: any = null;
  let events: any[] = [];
  if (ref) {
    shipment = await queryOne<any>(
      `SELECT id, reference, status, recipient_city, recipient_country FROM shipments
        WHERE tenant_id=$1 AND upper(reference)=upper($2)`,
      [tenantId, ref.trim()]
    );
    if (shipment) {
      events = await query<any>(
        `SELECT event_type, created_at FROM custody_events WHERE shipment_id=$1 ORDER BY seq`,
        [shipment.id]
      );
    }
  }
  const reached = new Set(events.map((e) => e.event_type));

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">Track & trace</h1>
      <p className="mt-2 text-slate-600">Volg de status van een zending met de referentie (bijv. PH-2026-000101).</p>

      <form method="get" className="mt-6 flex gap-2">
        <input name="ref" defaultValue={ref ?? ""} placeholder="PH-2026-000101"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
        <button className="ph-btn ph-btn-primary">Volgen</button>
      </form>

      {ref && !shipment && (
        <div className="mt-6 ph-card p-5 text-sm text-slate-600">Geen zending gevonden voor “{ref}”.</div>
      )}

      {shipment && (
        <div className="mt-8 ph-card p-6">
          <div className="flex items-center justify-between">
            <span className="font-mono text-lg font-bold text-slate-900">{shipment.reference}</span>
            <span className="ph-chip bg-orange-50 text-orange-700">{SHIPMENT_STATUS_LABEL[shipment.status] ?? shipment.status}</span>
          </div>
          <div className="text-sm text-slate-500">Bestemming: {shipment.recipient_city}, {shipment.recipient_country}</div>

          <ol className="mt-6 space-y-3">
            {PUBLIC_STEPS.map((step) => {
              const done = reached.has(step);
              const at = events.find((e) => e.event_type === step)?.created_at;
              return (
                <li key={step} className="flex items-center gap-3">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${done ? "bg-orange-500 text-white" : "bg-slate-200 text-slate-400"}`}>
                    {done ? "✓" : ""}
                  </span>
                  <span className={`flex-1 text-sm ${done ? "font-medium text-slate-800" : "text-slate-400"}`}>{STEP_LABEL[step]}</span>
                  {at && <span className="text-xs text-slate-400">{dateTimeNL(at)}</span>}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
