import Link from "next/link";
import { requireCapability } from "@/lib/auth";
import { query } from "@/db/client";
import { EmptyState, Chip, SectionTitle } from "@/components/ui";
import { dateTimeNL } from "@/lib/format";
import { getManifests, MODE_ICON } from "@/lib/legs";
import { createManifestAction } from "./actions";
import { getMessages } from "@/i18n";

export const metadata = { title: "Manifesten & legs" };

const STATUS_TONE: Record<string, "ok" | "warn" | "bad" | "neutral"> = {
  DRAFT: "neutral", SEALED: "warn", IN_TRANSIT: "warn", ARRIVED: "ok", CLOSED: "ok",
};

export default async function ManifestsPage() {
  const user = await requireCapability("ops.intake");
  const t = user.tenantId;
  const L = (await getMessages()).ui_man;
  const manifests = await getManifests(t);
  const hubs = await query<any>(`SELECT id, name FROM hubs WHERE tenant_id=$1 ORDER BY name`, [t]);
  const inp = "rounded-lg border border-slate-300 px-2 py-1.5 text-sm";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{L.title}</h1>
        <p className="text-sm text-slate-500">{L.sub}</p>
      </div>

      <section className="ph-card p-4">
        <SectionTitle sub={L.new_sub}>{L.new}</SectionTitle>
        <form action={createManifestAction} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm">{L.mode}
            <select name="mode" className={`mt-1 w-full ${inp}`}>
              <option value="AIR">{L.m_air}</option>
              <option value="SEA">{L.m_sea}</option>
              <option value="ROAD">{L.m_road}</option>
              <option value="RAIL">{L.m_rail}</option>
              <option value="TRAVELER">{L.m_traveler}</option>
            </select>
          </label>
          <label className="text-sm">{L.ctype}
            <select name="carrier_type" className={`mt-1 w-full ${inp}`}>
              <option value="FREIGHT">{L.ct_freight}</option>
              <option value="TRAVELER">{L.ct_traveler}</option>
              <option value="FLEET">{L.ct_fleet}</option>
              <option value="HUB">{L.ct_hub}</option>
            </select>
          </label>
          <label className="text-sm">{L.carrier_ref}
            <input name="carrier_ref" placeholder={L.carrier_ref_ph} className={`mt-1 w-full ${inp}`} />
          </label>
          <label className="text-sm">{L.origin_hub}
            <select name="origin_hub_id" className={`mt-1 w-full ${inp}`}>
              <option value="">{L.none}</option>
              {hubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </label>
          <label className="text-sm">{L.dest_hub}
            <select name="dest_hub_id" className={`mt-1 w-full ${inp}`}>
              <option value="">{L.none}</option>
              {hubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </label>
          <div className="flex items-end"><button className="ph-btn ph-btn-primary w-full text-sm">{L.create}</button></div>
        </form>
      </section>

      <section>
        <SectionTitle>{L.list}</SectionTitle>
        {manifests.length === 0 ? (
          <EmptyState icon="🧾" title={L.empty} />
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
                    {(m.origin ?? "—")} → {(m.dest ?? "—")} · {m.shipment_count} {L.shipments_n} · {m.leg_count} {L.legs_n}
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
