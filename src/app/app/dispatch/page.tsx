import { requireCapability } from "@/lib/auth";
import { query } from "@/db/client";
import { EmptyState, Chip, SectionTitle } from "@/components/ui";
import { hasCapability } from "@/lib/auth";
import { createDispatchJobAction, assignDispatchAction, advanceDispatchAction, addFleetAction, addVehicleAction, addDriverAction, approveKybAction } from "./actions";
import { getMessages } from "@/i18n";

export const metadata = { title: "Fleet & dispatch" };

export default async function DispatchPage() {
  const user = await requireCapability("ops.intake");
  const t = user.tenantId;
  const L = (await getMessages()).ui_disp;
  const inp = "rounded-lg border border-slate-300 px-2 py-1.5 text-sm";

  const fleets = await query<any>(`SELECT id, name, kyb_status, service_area FROM fleets WHERE tenant_id=$1`, [t]);
  const vehicles = await query<any>(`SELECT id, fleet_id, plate, vehicle_type, capacity_kg::float8 AS cap FROM vehicles WHERE tenant_id=$1`, [t]);
  const drivers = await query<any>(`SELECT id, fleet_id, name FROM drivers WHERE tenant_id=$1`, [t]);
  const jobs = await query<any>(
    `SELECT j.id, j.job_type, j.status, j.shipment_id, s.reference, f.name AS fleet, v.plate, d.name AS driver
       FROM dispatch_jobs j LEFT JOIN shipments s ON s.id=j.shipment_id
       LEFT JOIN fleets f ON f.id=j.fleet_id LEFT JOIN vehicles v ON v.id=j.vehicle_id LEFT JOIN drivers d ON d.id=j.driver_id
      WHERE j.tenant_id=$1 ORDER BY j.created_at DESC`, [t]);
  const readyShipments = await query<any>(
    `SELECT id, reference FROM shipments WHERE tenant_id=$1 AND status IN ('READY','CUSTOMS','IN_TRANSIT') ORDER BY created_at DESC LIMIT 20`, [t]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{L.title}</h1>
        <p className="text-sm text-slate-500">{L.sub}</p>
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <SectionTitle>{L.fleets}</SectionTitle>
          <form action={addFleetAction} className="flex gap-1">
            <input name="name" placeholder={L.fleet_name_ph} className={inp} />
            <input name="service_area" placeholder={L.area_ph} className={inp} />
            <button className="ph-btn ph-btn-primary text-sm">{L.add_fleet}</button>
          </form>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {fleets.map((f: any) => (
            <div key={f.id} className="ph-card p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">{f.name}</span>
                <span className="flex items-center gap-1">
                  <Chip tone={f.kyb_status === "VERIFIED" ? "ok" : f.kyb_status === "REJECTED" ? "bad" : "warn"}>KYB {f.kyb_status}</Chip>
                  {f.kyb_status === "PENDING" && hasCapability(user, "control.view") && (
                    <form action={approveKybAction}><input type="hidden" name="fleet_id" value={f.id} /><input type="hidden" name="outcome" value="approve" /><button className="text-xs text-orange-600 hover:underline">✓</button></form>
                  )}
                </span>
              </div>
              <div className="text-xs text-slate-500">{f.service_area}</div>
              <div className="mt-2 text-xs text-slate-500">
                {vehicles.filter((v: any) => v.fleet_id === f.id).length} {L.vehicles_n} ·
                {" "}{drivers.filter((d: any) => d.fleet_id === f.id).length} {L.drivers_n}
              </div>
              <div className="mt-2 grid gap-1 sm:grid-cols-2">
                <form action={addVehicleAction} className="flex gap-1">
                  <input type="hidden" name="fleet_id" value={f.id} />
                  <input name="plate" placeholder={L.plate_ph} className="w-full rounded border border-slate-300 px-1.5 py-1 text-xs" />
                  <button className="rounded bg-slate-100 px-2 text-xs">+🚐</button>
                </form>
                <form action={addDriverAction} className="flex gap-1">
                  <input type="hidden" name="fleet_id" value={f.id} />
                  <input name="name" placeholder={L.driver_ph} className="w-full rounded border border-slate-300 px-1.5 py-1 text-xs" />
                  <button className="rounded bg-slate-100 px-2 text-xs">+🧑</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="ph-card p-4">
        <SectionTitle sub={L.new_job_sub}>{L.new_job}</SectionTitle>
        <form action={createDispatchJobAction} className="flex flex-wrap gap-2">
          <select name="shipment_id" className={inp}>
            <option value="">{L.no_shipment}</option>
            {readyShipments.map((s: any) => <option key={s.id} value={s.id}>{s.reference}</option>)}
          </select>
          <select name="job_type" className={inp}><option value="LAST_MILE">{L.jt_last}</option><option value="PICKUP">{L.jt_pickup}</option><option value="HUB_TRANSFER">{L.jt_hub}</option></select>
          <button className="ph-btn ph-btn-primary text-sm">{L.add_job}</button>
        </form>
      </section>

      <section>
        <SectionTitle sub={L.workbench_sub}>{L.workbench}</SectionTitle>
        {jobs.length === 0 ? <EmptyState icon="📋" title={L.no_jobs} /> : (
          <div className="space-y-2">
            {jobs.map((j: any) => (
              <div key={j.id} className="ph-card p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800">{j.job_type} {j.reference ? `· ${j.reference}` : ""}</span>
                  <Chip tone={j.status === "DONE" ? "ok" : j.status === "UNASSIGNED" ? "neutral" : "warn"}>{j.status}</Chip>
                </div>
                {j.status === "UNASSIGNED" ? (
                  <form action={assignDispatchAction} className="mt-2 flex flex-wrap gap-2">
                    <input type="hidden" name="job_id" value={j.id} />
                    <select name="fleet_id" className={inp}>{fleets.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
                    <select name="vehicle_id" className={inp}>{vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.plate} ({v.cap}kg)</option>)}</select>
                    <select name="driver_id" className={inp}>{drivers.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
                    <button className="ph-btn ph-btn-primary text-xs">{L.assign}</button>
                  </form>
                ) : (
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-slate-500">{j.fleet} · {j.plate} · {j.driver}</span>
                    {j.status !== "DONE" && (
                      <form action={advanceDispatchAction} className="flex gap-1">
                        <input type="hidden" name="job_id" value={j.id} />
                        <input type="hidden" name="shipment_id" value={j.shipment_id ?? ""} />
                        <input type="hidden" name="to_status" value={j.status === "ASSIGNED" ? "IN_PROGRESS" : "DONE"} />
                        <button className="ph-btn ph-btn-ghost text-xs">{j.status === "ASSIGNED" ? L.enroute : L.finish}</button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
