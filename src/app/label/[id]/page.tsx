import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { queryOne } from "@/db/client";
import { volumetricKg as calcVol, chargeableKg as calcChargeable, VOLUMETRIC_DIVISOR } from "@/lib/packaging";
import { getMessages } from "@/i18n";

export const metadata = { title: "Verzendlabel" };

/** Pseudo-barcode: deterministische verticale balken uit de referentie (demo, geen echte Code128). */
function Barcode({ value }: { value: string }) {
  const bars: number[] = [];
  for (const ch of value) { const c = ch.charCodeAt(0); bars.push((c % 4) + 1, ((c >> 2) % 3) + 1); }
  let x = 0;
  return (
    <svg viewBox={`0 0 ${bars.reduce((a, b) => a + b + 1, 0)} 40`} className="h-12 w-full" preserveAspectRatio="none">
      {bars.map((w, i) => {
        const rect = i % 2 === 0 ? <rect key={i} x={x} y="0" width={w} height="40" fill="#0f172a" /> : null;
        x += w + 1;
        return rect;
      })}
    </svg>
  );
}

/** Pseudo-QR: 21×21 grid uit een hash van de referentie (demo). */
function FauxQR({ value }: { value: string }) {
  let h = 2166136261;
  for (const ch of value) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const cells: boolean[] = [];
  for (let i = 0; i < 441; i++) { h = Math.imul(h ^ i, 16777619); cells.push((h & 1) === 1); }
  return (
    <svg viewBox="0 0 21 21" className="h-24 w-24" shapeRendering="crispEdges">
      <rect width="21" height="21" fill="#fff" />
      {cells.map((on, i) => on ? <rect key={i} x={i % 21} y={Math.floor(i / 21)} width="1" height="1" fill="#0f172a" /> : null)}
      {/* finder patterns */}
      {[[0,0],[14,0],[0,14]].map(([fx,fy],k) => (
        <g key={k}><rect x={fx} y={fy} width="7" height="7" fill="#0f172a" /><rect x={fx+1} y={fy+1} width="5" height="5" fill="#fff" /><rect x={fx+2} y={fy+2} width="3" height="3" fill="#0f172a" /></g>
      ))}
    </svg>
  );
}

export default async function LabelPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSession();
  const { id } = await params;
  const s = await queryOne<any>(
    `SELECT s.*, s.total_declared_value_eur::float8 AS value, c.code AS corridor_code, c.name AS corridor_name, u.name AS sender_name
       FROM shipments s JOIN corridors c ON c.id=s.corridor_id JOIN users u ON u.id=s.sender_id
      WHERE s.id=$1 AND s.tenant_id=$2`, [id, user.tenantId]);
  if (!s) notFound();
  const t = (await getMessages()).label;
  const vol = calcVol(s.length_cm, s.width_cm, s.height_cm);
  const chargeable = calcChargeable(s.declared_weight_kg, vol);
  const dg = false;

  return (
    <main className="mx-auto max-w-md p-4 text-slate-900">
      <div className="mb-3 flex justify-between print:hidden">
        <a href={`/app/shipments/${id}`} className="text-sm text-orange-600">{t.back}</a>
        <span className="text-xs text-slate-400">{t.print_hint}</span>
      </div>

      <div className="rounded-xl border-2 border-slate-900 p-4">
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2">
          <div>
            <div className="text-lg font-extrabold">Buga<span className="text-orange-600">wuga</span></div>
            <div className="text-xs text-slate-500">{t.controlled_corridor}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">{t.corridor}</div>
            <div className="text-xl font-bold">{s.corridor_code}</div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <div className="text-xs uppercase text-slate-500">{t.reference}</div>
            <div className="font-mono text-xl font-bold">{s.reference}</div>
            <div className="mt-1 text-xs text-slate-500">{t.service}: {s.service_mode}</div>
          </div>
          <FauxQR value={s.reference} />
        </div>

        <Barcode value={s.reference} />
        <div className="text-center font-mono text-xs tracking-widest">{s.reference}</div>

        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-300 pt-3 text-sm">
          <div>
            <div className="text-xs uppercase text-slate-500">{t.sender}</div>
            <div className="font-medium">{s.sender_name}</div>
            <div className="text-xs text-slate-500">{s.country ?? "NL"}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-500">{t.recipient}</div>
            <div className="font-medium">{s.recipient_name}</div>
            <div className="text-xs text-slate-500">{s.recipient_city}, {s.recipient_country}</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-300 pt-3 text-center text-sm">
          <div><div className="text-xs text-slate-500">{t.actual}</div><div className="font-bold">{s.declared_weight_kg ?? "—"} kg</div></div>
          <div><div className="text-xs text-slate-500">{t.volumetric}</div><div className="font-bold">{vol ?? "—"} kg</div></div>
          <div><div className="text-xs text-slate-500">{t.chargeable}</div><div className="font-bold">{chargeable ?? "—"} kg</div></div>
        </div>
        <div className="mt-1 text-center text-[10px] text-slate-400">÷{VOLUMETRIC_DIVISOR} · {t.dims} {s.length_cm ?? "?"}×{s.width_cm ?? "?"}×{s.height_cm ?? "?"} cm</div>

        <div className="mt-3 flex items-center justify-between border-t border-slate-300 pt-2 text-xs">
          <span>{t.declared_value}: <strong>€{s.value}</strong></span>
          <span className="rounded bg-slate-900 px-2 py-0.5 font-semibold text-white">{dg ? "DG" : "STANDARD"}</span>
        </div>
        <div className="mt-2 text-[10px] text-slate-500">
          {t.handling.replace("{r}", s.reference)}
        </div>
      </div>
    </main>
  );
}
