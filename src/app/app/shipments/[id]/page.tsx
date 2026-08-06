import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession, hasCapability } from "@/lib/auth";
import { query, queryOne } from "@/db/client";
import { EligibilityBadge, StatusBadge, Chip, SectionTitle } from "@/components/ui";
import { eur, dateNL, dateTimeNL, timeAgo } from "@/lib/format";
import { acceptOfferAction, advanceStatusAction, submitInspectionAction } from "../actions";
import { openClaimAction, requestReturnAction } from "../../claims/actions";
import { VOLUMETRIC_DIVISOR, volumetricKg as calcVol, chargeableKg as calcChargeable } from "@/lib/packaging";

export const metadata = { title: "Zending" };

const NEXT_STATUS: Record<string, { to: string; event: string; label: string; needsSeal?: boolean }[]> = {
  BOOKED: [{ to: "INTAKE", event: "INTAKE", label: "Intake bij hub" }],
  INTAKE: [{ to: "SEALED", event: "SEALED", label: "Inspecteren & verzegelen", needsSeal: true }],
  SEALED: [{ to: "IN_CUSTODY", event: "HANDOVER", label: "Overdracht aan reiziger" }],
  IN_CUSTODY: [{ to: "IN_TRANSIT", event: "DEPARTED", label: "Vertrokken" }],
  IN_TRANSIT: [{ to: "CUSTOMS", event: "CUSTOMS", label: "Bij douane" }, { to: "READY", event: "ARRIVED", label: "Aangekomen" }],
  CUSTOMS: [{ to: "READY", event: "ARRIVED", label: "Vrijgegeven & klaar" }],
  READY: [{ to: "DELIVERED", event: "DELIVERED", label: "Afgeleverd (bevestig)" }],
};

export default async function ShipmentDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const user = await requireSession();
  const { id } = await params;
  const { error } = await searchParams;

  const s = await queryOne<any>(
    `SELECT s.*, s.total_declared_value_eur::float8 AS value, c.name AS corridor_name, c.code AS corridor_code,
            u.name AS sender_name
       FROM shipments s JOIN corridors c ON c.id=s.corridor_id JOIN users u ON u.id=s.sender_id
      WHERE s.id=$1 AND s.tenant_id=$2`,
    [id, user.tenantId]
  );
  if (!s) notFound();

  const isOwner = s.sender_id === user.id;
  const isOps = hasCapability(user, "ops.review");
  if (!isOwner && !isOps && !hasCapability(user, "offer.create")) redirect("/app");

  const items = await query<any>(
    `SELECT description, quantity, unit_value::float8 AS unit_value, category_code FROM shipment_items WHERE shipment_id=$1`,
    [id]
  );
  const decision = await queryOne<any>(
    `SELECT decision, reasons, rule_version, created_at FROM eligibility_decisions WHERE shipment_id=$1 ORDER BY id DESC LIMIT 1`,
    [id]
  );
  const offers = await query<any>(
    `SELECT o.id, o.price_eur::float8 AS price, o.message, o.status, o.created_at,
            u.name AS traveler_name, u.rating::float8 AS rating, u.city AS traveler_city
       FROM offers o JOIN users u ON u.id=o.traveler_id
      WHERE o.shipment_id=$1 ORDER BY o.created_at`,
    [id]
  );
  const custody = await query<any>(
    `SELECT ce.seq, ce.event_type, ce.notes, ce.seal_no, ce.created_at, u.name AS actor
       FROM custody_events ce LEFT JOIN users u ON u.id=ce.actor_id
      WHERE ce.shipment_id=$1 ORDER BY ce.seq`,
    [id]
  );
  const conv = await queryOne<{ id: string }>(`SELECT id FROM conversations WHERE shipment_id=$1 LIMIT 1`, [id]);
  const booking = await queryOne<any>(`SELECT agreed_price_eur::float8 AS price, payout_status FROM bookings WHERE shipment_id=$1`, [id]);
  const reasons: string[] = decision?.reasons ?? [];
  const nexts = NEXT_STATUS[s.status] ?? [];
  const volumetricKg = calcVol(s.length_cm, s.width_cm, s.height_cm);
  const chargeableKg = calcChargeable(s.declared_weight_kg, volumetricKg);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Link href={isOwner ? "/app/shipments" : "/app/control"} className="text-sm text-orange-600 hover:underline">← Terug</Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="font-mono text-xl font-bold text-slate-900">{s.reference}</h1>
          <EligibilityBadge decision={s.eligibility} />
          <StatusBadge status={s.status} />
        </div>
        <p className="text-sm text-slate-500">{s.corridor_name} · afzender {s.sender_name} · aangemaakt {dateNL(s.created_at)}</p>
      </div>

      {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>}

      <div className="grid gap-5 md:grid-cols-3">
        <div className="space-y-5 md:col-span-2">
          {/* Eligibility */}
          <section className="ph-card p-4">
            <SectionTitle sub={`Regelversie ${decision?.rule_version ?? "v1"} · deterministisch`}>Beoordeling</SectionTitle>
            <div className="mb-2"><EligibilityBadge decision={s.eligibility} /></div>
            <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
              {reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </section>

          {/* Items */}
          <section className="ph-card p-4">
            <SectionTitle sub={`${items.length} item(s) · totaal ${eur(s.value)}`}>Aangegeven inhoud</SectionTitle>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase text-slate-400">
                <th className="py-1">Omschrijving</th><th>Aantal</th><th>Waarde</th><th>Categorie</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, i) => (
                  <tr key={i}>
                    <td className="py-1.5">{it.description}</td>
                    <td>{it.quantity}</td>
                    <td>{eur(it.unit_value * it.quantity)}</td>
                    <td><Chip>{it.category_code}</Chip></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Offers */}
          <section className="ph-card p-4">
            <SectionTitle sub={s.eligibility === "ALLOW" ? "Kies een reiziger om te boeken" : "Boeken kan zodra de zending is toegestaan"}>
              Aanbiedingen ({offers.filter((o: any) => o.status === "OPEN").length})
            </SectionTitle>
            {offers.length === 0 ? (
              <p className="text-sm text-slate-500">Nog geen aanbiedingen van reizigers.</p>
            ) : (
              <div className="space-y-2">
                {offers.map((o) => (
                  <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">
                        {o.traveler_name} {o.rating && <span className="text-amber-500">★ {o.rating}</span>}
                        <span className="ml-2 font-normal text-slate-500">{o.traveler_city}</span>
                      </div>
                      {o.message && <div className="text-xs text-slate-500">{o.message}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{eur(o.price)}</span>
                      {o.status === "OPEN" && isOwner && s.eligibility === "ALLOW" && (
                        <form action={acceptOfferAction}>
                          <input type="hidden" name="shipment_id" value={s.id} />
                          <input type="hidden" name="offer_id" value={o.id} />
                          <button className="ph-btn ph-btn-primary text-xs">Accepteren</button>
                        </form>
                      )}
                      {o.status !== "OPEN" && <Chip tone={o.status === "ACCEPTED" ? "ok" : "neutral"}>{o.status}</Chip>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <section className="ph-card p-4">
            <SectionTitle>Ontvanger</SectionTitle>
            <div className="text-sm text-slate-700">
              <div className="font-medium">{s.recipient_name}</div>
              <div className="text-slate-500">{s.recipient_city}, {s.recipient_country}</div>
              {s.recipient_phone && <div className="text-slate-500">{s.recipient_phone}</div>}
            </div>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Gewicht</dt><dd>{s.declared_weight_kg ?? "?"} kg</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Deadline</dt><dd>{dateNL(s.deadline)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Aanleveren</dt><dd>{s.pickup_choice}</dd></div>
              {booking && (
                <div className="flex justify-between"><dt className="text-slate-500">Betaling</dt>
                  <dd><Chip tone={booking.payout_status === "RELEASED" ? "ok" : "warn"}>{booking.payout_status === "RELEASED" ? "Vrijgegeven" : "Vastgehouden"}</Chip></dd>
                </div>
              )}
            </dl>
            {conv && (
              <Link href={`/app/messages/${conv.id}`} className="ph-btn ph-btn-ghost mt-3 w-full text-sm">💬 Chat openen</Link>
            )}
          </section>

          {/* Label + volumetrisch gewicht */}
          <section className="ph-card p-4">
            <SectionTitle sub={`Volumetrisch gewicht (÷${VOLUMETRIC_DIVISOR})`}>Label</SectionTitle>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Volumetrisch</span>
              <span className="font-medium">{volumetricKg != null ? `${volumetricKg} kg` : "—"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Facturabel (max)</span>
              <span className="font-semibold">{chargeableKg != null ? `${chargeableKg} kg` : "—"}</span>
            </div>
            <Link href={`/label/${s.id}`} target="_blank" className="ph-btn ph-btn-ghost mt-3 w-full text-sm">🏷️ Label openen / printen</Link>
          </section>

          {/* Inspectie & verzegeling bij INTAKE (ops) */}
          {isOps && s.status === "INTAKE" && s.eligibility === "ALLOW" && (
            <section className="ph-card p-4">
              <SectionTitle sub="Controleer de inhoud en verzegel">Inspectie</SectionTitle>
              <form action={submitInspectionAction} className="space-y-2">
                <input type="hidden" name="shipment_id" value={s.id} />
                <div className="grid grid-cols-2 gap-1 text-sm">
                  {[["contents","Inhoud"],["quantity","Aantal"],["condition","Staat"],["serials","Serienrs"],["batteries","Batterijen"],["liquids","Vloeistoffen"],["declaration","Aangifte klopt"]].map(([k,l]) => (
                    <label key={k} className="flex items-center gap-1.5"><input type="checkbox" name={`chk_${k}`} defaultChecked /> {l}</label>
                  ))}
                </div>
                <input name="seal_no" required placeholder="Zegelnummer" className="w-full rounded border border-slate-300 px-2 py-1 text-sm" />
                <textarea name="notes" rows={2} placeholder="Opmerkingen" className="w-full rounded border border-slate-300 px-2 py-1 text-sm" />
                <div className="flex gap-2">
                  <button name="result" value="PASS" className="ph-btn ph-btn-primary flex-1 text-sm">Geslaagd & verzegel</button>
                  <button name="result" value="FAIL" className="ph-btn ph-btn-ghost text-sm text-rose-600">Afkeuren</button>
                </div>
              </form>
            </section>
          )}

          {/* Ops / owner status transitions (behalve de inspectie-stap bij INTAKE) */}
          {(isOps || isOwner) && nexts.length > 0 && s.eligibility === "ALLOW" && s.status !== "INTAKE" && (
            <section className="ph-card p-4">
              <SectionTitle sub="Custody & levenscyclus">Volgende stap</SectionTitle>
              <div className="space-y-2">
                {nexts.map((n) => (
                  <form key={n.to} action={advanceStatusAction} className="space-y-2 rounded-lg bg-slate-50 p-2">
                    <input type="hidden" name="shipment_id" value={s.id} />
                    <input type="hidden" name="to_status" value={n.to} />
                    <input type="hidden" name="event_type" value={n.event} />
                    {n.needsSeal && (
                      <input name="seal_no" placeholder="Zegelnummer" required
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm" />
                    )}
                    <button className="ph-btn ph-btn-primary w-full text-sm">{n.label}</button>
                  </form>
                ))}
              </div>
            </section>
          )}

          {/* Retour aanvragen (afzender, na levering) */}
          {isOwner && s.status === "DELIVERED" && (
            <details className="ph-card p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-800">↩️ Retour aanvragen</summary>
              <form action={requestReturnAction} className="mt-3 space-y-2">
                <input type="hidden" name="shipment_id" value={s.id} />
                <textarea name="reason" rows={2} placeholder="Reden voor retour" className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                <button className="ph-btn ph-btn-ghost w-full text-sm">Retour aanvragen</button>
              </form>
            </details>
          )}

          {/* Probleem melden (claim) */}
          {isOwner && ["BOOKED","INTAKE","SEALED","IN_CUSTODY","IN_TRANSIT","CUSTOMS","READY","DELIVERED"].includes(s.status) && (
            <details className="ph-card p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-800">🛟 Probleem melden</summary>
              <form action={openClaimAction} className="mt-3 space-y-2">
                <input type="hidden" name="shipment_id" value={s.id} />
                <select name="claim_type" className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
                  <option value="DAMAGE">Schade</option>
                  <option value="LOSS">Verlies / kwijt</option>
                  <option value="DELAY">Vertraging</option>
                  <option value="MISMATCH">Afwijkende inhoud</option>
                  <option value="OTHER">Anders</option>
                </select>
                <input name="amount_eur" type="number" step="0.01" placeholder="Geclaimd bedrag € (optioneel)"
                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                <textarea name="description" rows={2} required placeholder="Wat is er aan de hand?"
                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                <button className="ph-btn ph-btn-ghost w-full text-sm">Claim indienen</button>
              </form>
            </details>
          )}

          {/* Custody chain */}
          <section className="ph-card p-4">
            <SectionTitle sub="Append-only chain of custody">Historie</SectionTitle>
            <ol className="relative space-y-3 border-l border-slate-200 pl-4">
              {custody.map((c) => (
                <li key={c.seq} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-orange-500 ring-2 ring-white" />
                  <div className="text-sm font-medium text-slate-800">{c.event_type}{c.seal_no ? ` · zegel ${c.seal_no}` : ""}</div>
                  <div className="text-xs text-slate-500">{c.notes}</div>
                  <div className="text-[11px] text-slate-400">{dateTimeNL(c.created_at)} · {timeAgo(c.created_at)}{c.actor ? ` · ${c.actor}` : ""}</div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
