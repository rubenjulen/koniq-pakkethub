import Link from "next/link";
import { requireCapability } from "@/lib/auth";
import { query } from "@/db/client";
import { StatusBadge, EmptyState, SectionTitle, Chip } from "@/components/ui";
import { dateNL } from "@/lib/format";

export const metadata = { title: "Hub & intake" };

export default async function OpsPage() {
  const user = await requireCapability("ops.intake");
  const t = user.tenantId;

  const worklist = await query<any>(
    `SELECT s.id, s.reference, s.status, s.recipient_city, s.deadline, s.pickup_choice,
            s.declared_weight_kg::float8 AS kg, u.name AS sender
       FROM shipments s JOIN users u ON u.id=s.sender_id
      WHERE s.tenant_id=$1 AND s.eligibility='ALLOW' AND s.status IN ('BOOKED','INTAKE','SEALED','IN_CUSTODY')
      ORDER BY array_position(ARRAY['BOOKED','INTAKE','SEALED','IN_CUSTODY'], s.status), s.deadline NULLS LAST`,
    [t]
  );
  const hubs = await query<any>(`SELECT name, hub_type, city, country, services FROM hubs WHERE tenant_id=$1 ORDER BY country DESC`, [t]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">🏭 Hub & intake</h1>
        <p className="text-sm text-slate-500">Intake, inspectie, verzegeling en overdracht</p>
      </div>

      <section>
        <SectionTitle sub="Geboekte zendingen die intake/inspectie nodig hebben">Werklijst</SectionTitle>
        {worklist.length === 0 ? (
          <EmptyState icon="📋" title="Niets te doen">Er staan geen zendingen klaar voor intake.</EmptyState>
        ) : (
          <div className="ph-card divide-y divide-slate-100">
            {worklist.map((s) => (
              <Link key={s.id} href={`/app/shipments/${s.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-slate-50">
                <div>
                  <div className="font-mono text-sm font-semibold text-slate-800">{s.reference}</div>
                  <div className="text-xs text-slate-500">{s.sender} · {s.kg ?? "?"} kg · {s.pickup_choice} · deadline {dateNL(s.deadline)}</div>
                </div>
                <StatusBadge status={s.status} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle sub="Locaties in de corridor">Hubs & service points</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {hubs.map((h, i) => (
            <div key={i} className="ph-card p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">{h.name}</span>
                <Chip>{h.hub_type}</Chip>
              </div>
              <div className="text-xs text-slate-500">{h.city}, {h.country}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {(h.services ?? []).map((sv: string) => <span key={sv} className="ph-chip bg-slate-100 text-slate-600">{sv}</span>)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
