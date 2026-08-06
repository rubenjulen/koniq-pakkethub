import { requireCapability } from "@/lib/auth";
import { query } from "@/db/client";
import { PROVIDERS } from "@/lib/adapters/config";
import { Chip, SectionTitle, EmptyState } from "@/components/ui";
import { eur } from "@/lib/format";
import { simPaymentAction, simKycAction, simDeliveryAction, setCorridorStatusAction } from "./actions";

export const metadata = { title: "Test Console" };

export default async function ConsolePage() {
  const user = await requireCapability("control.view");
  const t = user.tenantId;

  const pendingPayments = await query<any>(
    `SELECT pi.id, pi.amount_eur::float8 AS amount, pi.description, s.reference
       FROM payment_intents pi
       LEFT JOIN bookings b ON b.id=pi.reference_id LEFT JOIN shipments s ON s.id=b.shipment_id
      WHERE pi.tenant_id=$1 AND pi.purpose='CHARGE' AND pi.status='REQUIRES_ACTION' ORDER BY pi.created_at`, [t]);
  const pendingKyc = await query<any>(
    `SELECT k.id, k.method, u.name FROM kyc_verifications k JOIN users u ON u.id=k.user_id
      WHERE k.tenant_id=$1 AND k.status='PENDING' ORDER BY k.created_at`, [t]);
  const inTransit = await query<any>(
    `SELECT id, reference, status FROM shipments WHERE tenant_id=$1 AND status IN ('BOOKED','INTAKE','SEALED','IN_CUSTODY','IN_TRANSIT','CUSTOMS','READY') ORDER BY created_at DESC LIMIT 12`, [t]);
  const corridors = await query<any>(`SELECT id, code, name, status FROM corridors WHERE tenant_id=$1 ORDER BY code`, [t]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">🧪 Test / Simulatie Console</h1>
        <p className="text-sm text-slate-500">
          Drijf hier de gesimuleerde externe events aan om te zien hoe de flow werkt. Bij livegang
          komen deze events van de echte providers (betaal-webhooks, IDV-beslissingen, scans).
        </p>
      </div>

      {/* Provider modes */}
      <section className="ph-card p-4">
        <SectionTitle>Actieve providers</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(PROVIDERS).map(([k, p]) => (
            <div key={k} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="text-slate-600">{k}</span>
              <span className="flex items-center gap-2"><span className="text-xs text-slate-400">{p.name}</span><Chip tone={p.mode === "SIMULATED" ? "warn" : "ok"}>{p.mode}</Chip></span>
            </div>
          ))}
        </div>
      </section>

      {/* Payments */}
      <section className="ph-card p-4">
        <SectionTitle sub="Betalingen die op klantactie wachten">💳 Betalingen simuleren</SectionTitle>
        {pendingPayments.length === 0 ? <p className="text-sm text-slate-400">Geen openstaande betalingen.</p> : (
          <div className="space-y-2">
            {pendingPayments.map((p: any) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-2">
                <span className="text-sm text-slate-700"><span className="font-mono font-semibold">{p.reference}</span> · {eur(p.amount)}</span>
                <div className="flex gap-2">
                  <form action={simPaymentAction}><input type="hidden" name="intent_id" value={p.id} /><input type="hidden" name="outcome" value="success" /><button className="ph-btn ph-btn-primary text-xs">✓ Geslaagd</button></form>
                  <form action={simPaymentAction}><input type="hidden" name="intent_id" value={p.id} /><input type="hidden" name="outcome" value="fail" /><button className="ph-btn ph-btn-ghost text-xs">✕ Mislukt</button></form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* KYC */}
      <section className="ph-card p-4">
        <SectionTitle sub="Identiteitsverificaties in afwachting">🪪 KYC simuleren</SectionTitle>
        {pendingKyc.length === 0 ? <p className="text-sm text-slate-400">Geen openstaande verificaties.</p> : (
          <div className="space-y-2">
            {pendingKyc.map((k: any) => (
              <div key={k.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-2">
                <span className="text-sm text-slate-700">{k.name} · {k.method}</span>
                <div className="flex gap-2">
                  <form action={simKycAction}><input type="hidden" name="verification_id" value={k.id} /><input type="hidden" name="outcome" value="approve" /><button className="ph-btn ph-btn-primary text-xs">Goedkeuren</button></form>
                  <form action={simKycAction}><input type="hidden" name="verification_id" value={k.id} /><input type="hidden" name="outcome" value="reject" /><button className="ph-btn ph-btn-ghost text-xs">Afwijzen</button></form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Delivery */}
      <section className="ph-card p-4">
        <SectionTitle sub="Zet direct op afgeleverd + betaal de reiziger uit">📦 Levering simuleren</SectionTitle>
        {inTransit.length === 0 ? <EmptyState icon="✅" title="Geen zendingen onderweg" /> : (
          <div className="space-y-1">
            {inTransit.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between gap-2 py-1 text-sm">
                <span><span className="font-mono font-semibold text-slate-800">{s.reference}</span> <Chip>{s.status}</Chip></span>
                <form action={simDeliveryAction}><input type="hidden" name="shipment_id" value={s.id} /><button className="ph-btn ph-btn-ghost text-xs">Simuleer levering →</button></form>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Corridors (white-label / activatie) */}
      <section className="ph-card p-4">
        <SectionTitle sub="Activeer of pauzeer corridors (white-label / uitbreiding)">🌍 Corridors</SectionTitle>
        <div className="space-y-2">
          {corridors.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between gap-2 text-sm">
              <span>{c.name} <Chip tone={c.status === "PILOT" || c.status === "LIVE" ? "ok" : "neutral"}>{c.status}</Chip></span>
              <form action={setCorridorStatusAction} className="flex gap-1">
                <input type="hidden" name="corridor_id" value={c.id} />
                <select name="status" defaultValue={c.status} className="rounded border border-slate-300 px-2 py-1 text-xs">
                  {["PLANNED", "PILOT", "LIVE", "PAUSED"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button className="ph-btn ph-btn-ghost text-xs">Zet</button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
