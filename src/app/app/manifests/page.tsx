import Link from "next/link";
import { requireCapability } from "@/lib/auth";
import { query } from "@/db/client";
import { EmptyState, Chip, SectionTitle } from "@/components/ui";
import { dateTimeNL } from "@/lib/format";
import { getManifests, MODE_ICON } from "@/lib/legs";
import { createManifestAction } from "./actions";

export const metadata = { title: "Manifesten & legs" };

const STATUS_TONE: Record<string, "ok" | "warn" | "bad" | "neutral"> = {
  DRAFT: "neutral", SEALED: "warn", IN_TRANSIT: "warn", ARRIVED: "ok", CLOSED: "ok",
};

export default async function ManifestsPage() {
  const user = await requireCapability("ops.intake");
  const t = user.tenantId;
  const manifests = await getManifests(t);
  const hubs = await query<any>(`SELECT id, name FROM hubs WHERE tenant_id=$1 ORDER BY name`, [t]);
  const inp = "rounded-lg border border-slate-300 px-2 py-1.5 text-sm";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">🧾 Manifesten & legs</h1>
        <p className="text-sm text-slate-500">Bundel zendingen op één beweging (vlucht, zeevracht of rit) en volg de multimodale keten</p>
      </div>

      <section className="ph-card p-4">
        <SectionTitle sub="Kies modus, vervoerder en hubs">Nieuw manifest</SectionTitle>
        <form action={createManifestAction} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm">Modus
            <select name="mode" className={`mt-1 w-full ${inp}`}>
              <option value="AIR">✈️ Lucht</option>
              <option value="SEA">🚢 Zee</option>
              <option value="ROAD">🚚 Weg</option>
              <option value="RAIL">🚂 Spoor</option>
              <option value="TRAVELER">🧳 Reiziger</option>
            </select>
          </label>
          <label className="text-sm">Vervoerder-type
            <select name="carrier_type" className={`mt-1 w-full ${inp}`}>
              <option value="FREIGHT">Freight-partner</option>
              <option value="TRAVELER">Reiziger</option>
              <option value="FLEET">Fleet</option>
              <option value="HUB">Hub</option>
            </select>
          </label>
          <label className="text-sm">Vlucht-/kentekennr.
            <input name="carrier_ref" placeholder="bv. KL-713" className={`mt-1 w-full ${inp}`} />
          </label>
          <label className="text-sm">Herkomst-hub
            <select name="origin_hub_id" className={`mt-1 w-full ${inp}`}>
              <option value="">—</option>
              {hubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Bestemming-hub
            <select name="dest_hub_id" className={`mt-1 w-full ${inp}`}>
              <option value="">—</option>
              {hubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </label>
          <div className="flex items-end"><button className="ph-btn ph-btn-primary w-full text-sm">+ Manifest aanmaken</button></div>
        </form>
      </section>

      <section>
        <SectionTitle>Manifesten</SectionTitle>
        {manifests.length === 0 ? (
          <EmptyState icon="🧾" title="Nog geen manifesten" />
        ) : (
          <div className="mt-2 space-y-2">
            {manifests.map((m) => (
              <Link key={m.id} href={`/app/manifests/${m.id}`} className="ph-card flex items-center justify-between p-3 hover:ring-1 hover:ring-orange-200">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{MODE_ICON[m.mode] ?? "•"}</span>
                    <span className="font-mono font-semibold text-slate-800">{m.reference}</span>
                    {m.carrier_ref && <span className="text-xs text-slate-500">· {m.carrier_ref}</span>}
                  </div>
                  <div className="text-xs text-slate-500">
                    {(m.origin ?? "—")} → {(m.dest ?? "—")} · {m.shipment_count} zending(en) · {m.leg_count} leg(s)
                    {m.depart_at ? ` · ${dateTimeNL(m.depart_at)}` : ""}
                  </div>
                </div>
                <Chip tone={STATUS_TONE[m.status] ?? "neutral"}>{m.status}</Chip>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
