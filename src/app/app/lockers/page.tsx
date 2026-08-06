import { requireCapability } from "@/lib/auth";
import { query } from "@/db/client";
import { Chip, SectionTitle, EmptyState } from "@/components/ui";
import { dateTimeNL } from "@/lib/format";
import {
  assignCompartmentAction, releaseCompartmentAction, addTimeslotAction,
  bookSlotAction, createReconAction, addReconScanAction, closeReconAction,
} from "./actions";

export const metadata = { title: "Lockers & tijdslots" };

const COMP_TONE: Record<string, string> = {
  FREE: "bg-orange-50 text-orange-700 ring-orange-200",
  RESERVED: "bg-amber-50 text-amber-700 ring-amber-200",
  OCCUPIED: "bg-slate-800 text-white ring-slate-800",
  OUT_OF_SERVICE: "bg-rose-50 text-rose-400 ring-rose-200 line-through",
};
const RECON_TONE: Record<string, "ok" | "warn" | "bad" | "neutral"> = {
  OPEN: "neutral", BALANCED: "ok", DISCREPANCY: "bad", CLOSED: "neutral",
};

export default async function LockersPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await requireCapability("ops.intake");
  const t = user.tenantId;
  const sp = await searchParams;
  const inp = "rounded-lg border border-slate-300 px-2 py-1.5 text-sm";

  const lockers = await query<any>(`SELECT id, code, name, city FROM lockers WHERE tenant_id=$1 ORDER BY code`, [t]);
  const comps = await query<any>(
    `SELECT c.id, c.locker_id, c.label, c.size, c.status, c.pin_code, s.reference AS shipment_ref
       FROM locker_compartments c LEFT JOIN shipments s ON s.id=c.shipment_id
      WHERE c.tenant_id=$1 ORDER BY c.label`, [t]);
  const freeShipments = await query<any>(
    `SELECT id, reference FROM shipments WHERE tenant_id=$1 AND status IN ('READY','CUSTOMS','IN_TRANSIT','SEALED') ORDER BY created_at DESC LIMIT 30`, [t]);
  const hubs = await query<any>(`SELECT id, name FROM hubs WHERE tenant_id=$1 ORDER BY name`, [t]);
  const slots = await query<any>(
    `SELECT ts.id, ts.slot_type, ts.starts_at, ts.capacity, ts.booked, h.name AS hub
       FROM timeslots ts LEFT JOIN hubs h ON h.id=ts.hub_id
      WHERE ts.tenant_id=$1 AND ts.starts_at >= date_trunc('day', now())
      ORDER BY ts.starts_at LIMIT 24`, [t]);
  const recons = await query<any>(
    `SELECT r.id, r.reference, r.status, r.expected_count, r.scanned_count, h.name AS hub, r.created_at
       FROM reconciliations r LEFT JOIN hubs h ON h.id=r.hub_id
      WHERE r.tenant_id=$1 ORDER BY r.created_at DESC LIMIT 10`, [t]);
  const openRecon = recons.find((r) => r.status !== "CLOSED");
  const reconScans = openRecon
    ? await query<any>(`SELECT shipment_ref, result FROM reconciliation_scans WHERE reconciliation_id=$1 ORDER BY scanned_at`, [openRecon.id])
    : [];

  const notice = sp.ok ? "Bijgewerkt." : sp.error === "full" ? "Tijdslot is vol." : sp.error === "occupied" ? "Compartiment is niet vrij." : sp.error ? "Actie niet mogelijk." : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">🔐 Lockers & tijdslots</h1>
        <p className="text-sm text-slate-500">Afhaalkluizen, intake-/afgifte-tijdslots en voorraad-reconciliatie in de hub</p>
      </div>
      {notice && <div className={`rounded-lg px-3 py-2 text-sm ring-1 ${sp.error ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-orange-50 text-orange-700 ring-orange-200"}`}>{notice}</div>}

      {/* Lockers */}
      {lockers.map((lk) => {
        const mine = comps.filter((c) => c.locker_id === lk.id);
        return (
          <section key={lk.id} className="ph-card p-4">
            <SectionTitle sub={`${lk.code} · ${lk.city ?? ""} · ${mine.filter((c) => c.status === "FREE").length}/${mine.length} vrij`}>{lk.name}</SectionTitle>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {mine.map((c) => (
                <div key={c.id} className={`rounded-xl p-3 text-sm ring-1 ${COMP_TONE[c.status] ?? COMP_TONE.FREE}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{c.label}</span>
                    <span className="text-xs opacity-80">{c.size}</span>
                  </div>
                  {c.status === "OCCUPIED" ? (
                    <div className="mt-1">
                      <div className="font-mono text-xs">{c.shipment_ref ?? "—"}</div>
                      <div className="text-xs opacity-80">pin {c.pin_code}</div>
                      <form action={releaseCompartmentAction} className="mt-1">
                        <input type="hidden" name="compartment_id" value={c.id} />
                        <button className="w-full rounded bg-white/20 px-2 py-1 text-xs font-medium hover:bg-white/30">Vrijgeven / opgehaald</button>
                      </form>
                    </div>
                  ) : c.status === "FREE" ? (
                    <form action={assignCompartmentAction} className="mt-1 space-y-1">
                      <input type="hidden" name="compartment_id" value={c.id} />
                      <select name="shipment_id" className="w-full rounded border border-orange-200 bg-white px-1 py-1 text-xs">
                        {freeShipments.map((s) => <option key={s.id} value={s.id}>{s.reference}</option>)}
                      </select>
                      <button className="w-full rounded bg-orange-600 px-2 py-1 text-xs font-medium text-white hover:bg-orange-700">Toewijzen</button>
                    </form>
                  ) : (
                    <div className="mt-1 text-xs">{c.status}</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* Tijdslots */}
      <section className="ph-card p-4">
        <SectionTitle sub="Capaciteit per venster voor intake, afgifte en afhalen">Tijdslots</SectionTitle>
        <form action={addTimeslotAction} className="mb-3 flex flex-wrap items-end gap-2">
          <select name="hub_id" className={inp}>{hubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select>
          <select name="slot_type" className={inp}><option value="DROPOFF">Afgifte</option><option value="INTAKE">Intake</option><option value="PICKUP">Afhalen</option></select>
          <input type="date" name="day" className={inp} />
          <input type="number" name="hour" defaultValue={9} min={0} max={22} className={`${inp} w-20`} title="Beginuur" />
          <input type="number" name="capacity" defaultValue={5} min={1} className={`${inp} w-20`} title="Capaciteit" />
          <button className="ph-btn ph-btn-primary text-sm">+ Slot</button>
        </form>
        {slots.length === 0 ? <EmptyState icon="🕓" title="Geen komende tijdslots" /> : (
          <div className="divide-y divide-slate-100 text-sm">
            {slots.map((s) => {
              const full = s.booked >= s.capacity;
              return (
                <div key={s.id} className="flex items-center justify-between py-2">
                  <div>
                    <span className="font-medium text-slate-800">{s.slot_type}</span>
                    <span className="ml-2 text-slate-500">{dateTimeNL(s.starts_at)} · {s.hub ?? "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Chip tone={full ? "bad" : "ok"}>{s.booked}/{s.capacity}</Chip>
                    {!full && (
                      <form action={bookSlotAction}>
                        <input type="hidden" name="timeslot_id" value={s.id} />
                        <button className="ph-btn ph-btn-ghost text-xs">Boeken</button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Reconciliatie */}
      <section className="ph-card p-4">
        <SectionTitle sub="Tel wat fysiek in de hub ligt tegen wat het systeem verwacht">Voorraad-reconciliatie</SectionTitle>
        {!openRecon ? (
          <form action={createReconAction} className="flex flex-wrap items-end gap-2">
            <select name="hub_id" className={inp}>{hubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select>
            <button className="ph-btn ph-btn-primary text-sm">Nieuwe telling starten</button>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono font-semibold text-slate-800">{openRecon.reference}</span>
                <span className="ml-2 text-sm text-slate-500">{openRecon.hub ?? "—"} · verwacht {openRecon.expected_count} · gescand {openRecon.scanned_count}</span>
              </div>
              <Chip tone={RECON_TONE[openRecon.status] ?? "neutral"}>{openRecon.status}</Chip>
            </div>
            <form action={addReconScanAction} className="flex flex-wrap gap-2">
              <input type="hidden" name="reconciliation_id" value={openRecon.id} />
              <input name="shipment_ref" placeholder="Scan/plak referenties (bv. PH-2026-000101)" className={`flex-1 ${inp}`} />
              <button className="ph-btn ph-btn-primary text-sm">Scannen</button>
            </form>
            {reconScans.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {reconScans.map((sc, i) => (
                  <span key={i} className={`rounded px-1.5 py-0.5 text-xs font-mono ring-1 ${sc.result === "MATCH" ? "bg-orange-50 text-orange-700 ring-orange-200" : sc.result === "UNEXPECTED" ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-rose-50 text-rose-700 ring-rose-200"}`}>
                    {sc.shipment_ref} · {sc.result}
                  </span>
                ))}
              </div>
            )}
            <form action={closeReconAction}>
              <input type="hidden" name="reconciliation_id" value={openRecon.id} />
              <button className="ph-btn ph-btn-ghost text-sm">Telling afsluiten (ontbrekende = MISSING)</button>
            </form>
          </div>
        )}
        {recons.filter((r) => r.status === "CLOSED").length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <div className="mb-1 text-xs font-medium uppercase text-slate-400">Afgesloten</div>
            <div className="divide-y divide-slate-100 text-sm">
              {recons.filter((r) => r.status === "CLOSED").map((r) => (
                <div key={r.id} className="flex items-center justify-between py-1.5">
                  <span className="font-mono text-slate-600">{r.reference}</span>
                  <span className="text-xs text-slate-400">{dateTimeNL(r.created_at)} · {r.scanned_count}/{r.expected_count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
