import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import { query } from "@/db/client";
import { Chip, SectionTitle, EmptyState } from "@/components/ui";
import { dateTimeNL } from "@/lib/format";
import { getManifest, MANIFEST_FLOW, MODE_ICON } from "@/lib/legs";
import { advanceManifestAction, attachLegAction, detachLegAction } from "../actions";
import { getMessages } from "@/i18n";

export const metadata = { title: "Manifest" };

const STATUS_TONE: Record<string, "ok" | "warn" | "bad" | "neutral"> = {
  DRAFT: "neutral", SEALED: "warn", IN_TRANSIT: "warn", ARRIVED: "ok", CLOSED: "ok",
};

export default async function ManifestDetail({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireCapability("ops.intake");
  const { id } = await params;
  const { error } = await searchParams;
  const L = (await getMessages()).ui_man;
  const data = await getManifest(user.tenantId, id);
  if (!data) notFound();
  const { manifest: m, legs } = data;
  const flow = MANIFEST_FLOW[m.status] ?? [];
  const locked = !["DRAFT", "SEALED"].includes(m.status);

  // Kandidaat-zendingen om toe te voegen: nog niet op dit manifest, en klaar voor linehaul.
  const candidates = await query<any>(
    `SELECT s.id, s.reference, s.recipient_city, s.status
       FROM shipments s
      WHERE s.tenant_id=$1 AND s.eligibility='ALLOW'
        AND s.status IN ('BOOKED','INTAKE','SEALED','IN_CUSTODY')
        AND NOT EXISTS (SELECT 1 FROM shipment_legs l WHERE l.shipment_id=s.id AND l.manifest_id=$2)
      ORDER BY s.created_at DESC LIMIT 25`, [user.tenantId, id]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Link href="/app/manifests" className="text-sm text-orange-600 hover:underline">{L.back}</Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-lg">{MODE_ICON[m.mode] ?? "•"}</span>
          <h1 className="font-mono text-xl font-bold text-slate-900">{m.reference}</h1>
          <Chip tone={STATUS_TONE[m.status] ?? "neutral"}>{m.status}</Chip>
        </div>
        <p className="text-sm text-slate-500">
          {(m.origin_name ?? "—")} → {(m.dest_name ?? "—")} · {m.carrier_type}{m.carrier_ref ? ` · ${m.carrier_ref}` : ""}
          {m.depart_at ? ` · ${L.depart} ${dateTimeNL(m.depart_at)}` : ""}
        </p>
      </div>

      {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
        {error === "locked" ? L.err_locked : L.err_generic}
      </div>}

      <div className="grid gap-5 md:grid-cols-3">
        <div className="space-y-5 md:col-span-2">
          <section className="ph-card p-4">
            <SectionTitle sub={`${legs.length} ${L.linked_sub}`}>{L.linked}</SectionTitle>
            {legs.length === 0 ? (
              <EmptyState icon="📦" title={L.no_linked} />
            ) : (
              <div className="divide-y divide-slate-100">
                {legs.map((l: any) => (
                  <div key={l.id} className="flex items-center justify-between py-2 text-sm">
                    <div className="min-w-0">
                      <Link href={`/app/shipments/${l.shipment_id}`} className="font-mono font-medium text-orange-700 hover:underline">{l.shipment_ref}</Link>
                      <span className="ml-2 text-slate-500">→ {l.recipient_city}</span>
                      <div className="text-xs text-slate-400">{l.from_label} → {l.to_label} · {l.status}</div>
                    </div>
                    {!locked && (
                      <form action={detachLegAction}>
                        <input type="hidden" name="manifest_id" value={m.id} />
                        <input type="hidden" name="leg_id" value={l.id} />
                        <button className="text-slate-400 hover:text-rose-500" title={L.detach}>✕</button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {!locked && (
            <section className="ph-card p-4">
              <SectionTitle sub={L.attach_sub}>{L.attach}</SectionTitle>
              {candidates.length === 0 ? (
                <p className="text-sm text-slate-500">{L.no_candidates}</p>
              ) : (
                <form action={attachLegAction} className="flex flex-wrap gap-2">
                  <input type="hidden" name="manifest_id" value={m.id} />
                  <select name="shipment_id" className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
                    {candidates.map((c) => <option key={c.id} value={c.id}>{c.reference} — {c.recipient_city} ({c.status})</option>)}
                  </select>
                  <button className="ph-btn ph-btn-primary text-sm">{L.attach_btn}</button>
                </form>
              )}
            </section>
          )}
        </div>

        <div className="space-y-5">
          <section className="ph-card p-4">
            <SectionTitle sub={L.status_sub}>{L.status}</SectionTitle>
            <ol className="space-y-1.5 text-sm">
              {["DRAFT", "SEALED", "IN_TRANSIT", "ARRIVED", "CLOSED"].map((st) => {
                const order = ["DRAFT", "SEALED", "IN_TRANSIT", "ARRIVED", "CLOSED"];
                const done = order.indexOf(m.status) >= order.indexOf(st);
                return (
                  <li key={st} className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${done ? "bg-orange-500" : "bg-slate-200"}`} />
                    <span className={done ? "font-medium text-slate-800" : "text-slate-400"}>{st}</span>
                  </li>
                );
              })}
            </ol>
            {flow.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                {flow.map((f) => (
                  <form key={f.to} action={advanceManifestAction}>
                    <input type="hidden" name="manifest_id" value={m.id} />
                    <input type="hidden" name="to" value={f.to} />
                    <button className="ph-btn ph-btn-primary w-full text-sm">{(L as Record<string, string>)[`flow_${f.to}`] ?? f.to}</button>
                  </form>
                ))}
              </div>
            )}
            {flow.length === 0 && <p className="mt-3 text-xs text-slate-400">{L.done}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
