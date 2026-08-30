import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession, hasCapability } from "@/lib/auth";
import { query, queryOne } from "@/db/client";
import { EligibilityBadge, StatusBadge, Chip, SectionTitle } from "@/components/ui";
import { eur, dateNL, dateTimeNL, timeAgo } from "@/lib/format";
import { acceptOfferAction, advanceStatusAction, submitInspectionAction, submitRatingAction } from "../actions";
import { publishRequestAction } from "../../marketplace/actions";
import { openClaimAction, requestReturnAction } from "../../claims/actions";
import { VOLUMETRIC_DIVISOR, volumetricKg as calcVol, chargeableKg as calcChargeable } from "@/lib/packaging";
import { getShipmentLegs } from "@/lib/legs";
import { RouteTimeline } from "@/components/RouteTimeline";
import { getMessages } from "@/i18n";
import type { Messages } from "@/i18n/messages/nl";

export const metadata = { title: "Zending" };

type NextKey = keyof Messages["shipd"];
const NEXT_STATUS: Record<string, { to: string; event: string; key: NextKey; needsSeal?: boolean; needsReceipt?: boolean }[]> = {
  BOOKED: [{ to: "INTAKE", event: "INTAKE", key: "n_intake" }],
  INTAKE: [{ to: "SEALED", event: "SEALED", key: "n_seal", needsSeal: true }],
  SEALED: [{ to: "IN_CUSTODY", event: "HANDOVER", key: "n_handover" }],
  IN_CUSTODY: [{ to: "IN_TRANSIT", event: "DEPARTED", key: "n_departed" }],
  IN_TRANSIT: [{ to: "CUSTOMS", event: "CUSTOMS", key: "n_customs" }, { to: "READY", event: "ARRIVED", key: "n_arrived" }],
  CUSTOMS: [{ to: "READY", event: "ARRIVED", key: "n_released" }],
  READY: [{ to: "DELIVERED", event: "DELIVERED", key: "n_delivered", needsReceipt: true }],
};

export default async function ShipmentDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  const user = await requireSession();
  const { id } = await params;
  const { error, ok } = await searchParams;
  const m = await getMessages();
  const pm = m.mkt2;
  const d = m.shipd;

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
    `SELECT description, quantity, unit_value::float8 AS unit_value, category_code FROM shipment_items WHERE shipment_id=$1`, [id]
  );
  const decision = await queryOne<any>(
    `SELECT decision, reasons, rule_version, created_at FROM eligibility_decisions WHERE shipment_id=$1 ORDER BY id DESC LIMIT 1`, [id]
  );
  const offers = await query<any>(
    `SELECT o.id, o.price_eur::float8 AS price, o.message, o.status, o.created_at,
            u.name AS traveler_name, u.rating::float8 AS rating, u.city AS traveler_city
       FROM offers o JOIN users u ON u.id=o.traveler_id WHERE o.shipment_id=$1 ORDER BY o.created_at`, [id]
  );
  const custody = await query<any>(
    `SELECT ce.seq, ce.event_type, ce.notes, ce.seal_no, ce.created_at, u.name AS actor
       FROM custody_events ce LEFT JOIN users u ON u.id=ce.actor_id WHERE ce.shipment_id=$1 ORDER BY ce.seq`, [id]
  );
  const legs = await getShipmentLegs(id);
  const conv = await queryOne<{ id: string }>(`SELECT id FROM conversations WHERE shipment_id=$1 LIMIT 1`, [id]);
  const booking = await queryOne<any>(`SELECT agreed_price_eur::float8 AS price, payout_status, traveler_id FROM bookings WHERE shipment_id=$1`, [id]);
  // Beoordeling ná levering: bepaal tegenpartij + rol voor deze kijker.
  const isTraveler = booking?.traveler_id === user.id;
  const rateeId = isOwner ? booking?.traveler_id : isTraveler ? s.sender_id : null;
  const rateRole = isOwner ? "CARRIER" : "CLIENT"; // je beoordeelt de reiziger (carrier) of de afzender (client)
  const alreadyRated = rateeId
    ? await queryOne<{ id: string }>(`SELECT id FROM ratings WHERE rater_id=$1 AND ratee_id=$2 AND shipment_id=$3 AND role=$4`, [user.id, rateeId, id, rateRole])
    : { id: "x" };
  const reasons: string[] = decision?.reasons ?? [];
  const nexts = NEXT_STATUS[s.status] ?? [];
  const volumetricKg = calcVol(s.length_cm, s.width_cm, s.height_cm);
  const chargeableKg = calcChargeable(s.declared_weight_kg, volumetricKg);
  const checks: [string, string][] = [["contents", d.c_contents], ["quantity", d.c_quantity], ["condition", d.c_condition], ["serials", d.c_serials], ["batteries", d.c_batteries], ["liquids", d.c_liquids], ["declaration", d.c_declaration]];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Link href={isOwner ? "/app/shipments" : "/app/control"} className="text-sm text-orange-600 hover:underline">{d.back}</Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="font-mono text-xl font-bold text-slate-900">{s.reference}</h1>
          <EligibilityBadge decision={s.eligibility} />
          <StatusBadge status={s.status} />
        </div>
        <p className="text-sm text-slate-500">{s.corridor_name} · {d.sender} {s.sender_name} · {d.created} {dateNL(s.created_at)}</p>
      </div>

      {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{error === "receipt" ? d.err_receipt : error}</div>}
      {ok && <div className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700 ring-1 ring-orange-200">{pm.saved}</div>}

      {isOwner && s.eligibility === "ALLOW" && (
        <details className="ph-card p-4" open={!s.visible}>
          <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-800">
            <span>🧳 {pm.pub_req_title}</span>
            <span className={`ph-chip ${s.visible ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-600"}`}>{s.visible ? `👁 ${pm.visible_on}` : pm.visible_off}</span>
          </summary>
          <form action={publishRequestAction} className="mt-3 grid gap-2 sm:grid-cols-2">
            <input type="hidden" name="shipment_id" value={s.id} />
            <label className="block"><span className="text-xs text-slate-500">{pm.pub_price_pay}</span><input name="offered_price_eur" type="number" step="0.5" min="0" defaultValue={s.offered_price_eur ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
            <label className="block sm:col-span-2"><span className="text-xs text-slate-500">{pm.pub_req_info}</span><input name="request_info" maxLength={200} defaultValue={s.request_info ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="visible" defaultChecked={s.visible} /> {pm.pub_visible}</label>
            <div className="sm:col-span-2"><button className="ph-btn ph-btn-primary text-sm">{pm.pub_req_save}</button></div>
          </form>
        </details>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        <div className="space-y-5 md:col-span-2">
          <section className="ph-card p-4">
            <SectionTitle sub={`${d.rule_version} ${decision?.rule_version ?? "v1"} · ${d.deterministic}`}>{d.assessment}</SectionTitle>
            <div className="mb-2"><EligibilityBadge decision={s.eligibility} /></div>
            <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
              {reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </section>

          <section className="ph-card p-4">
            <SectionTitle sub={`${items.length} item(s) · ${d.total} ${eur(s.value)}`}>{d.declared_content}</SectionTitle>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase text-slate-400">
                <th className="py-1">{d.th_desc}</th><th>{d.th_qty}</th><th>{d.th_value}</th><th>{d.th_cat}</th>
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

          {legs.length > 0 && (
            <section className="ph-card p-4">
              <SectionTitle sub={m.route.sub}>{m.route.title}</SectionTitle>
              <RouteTimeline legs={legs} t={m.route} />
            </section>
          )}

          <section className="ph-card p-4">
            <SectionTitle sub={s.eligibility === "ALLOW" ? d.offers_sub_allow : d.offers_sub_wait}>
              {d.offers} ({offers.filter((o: any) => o.status === "OPEN").length})
            </SectionTitle>
            {offers.length === 0 ? (
              <p className="text-sm text-slate-500">{d.no_offers}</p>
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
                          <button className="ph-btn ph-btn-primary text-xs">{d.accept}</button>
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

        <div className="space-y-5">
          <section className="ph-card p-4">
            <SectionTitle>{d.recipient}</SectionTitle>
            <div className="text-sm text-slate-700">
              <div className="font-medium">{s.recipient_name}</div>
              <div className="text-slate-500">{s.recipient_city}, {s.recipient_country}</div>
              {s.recipient_phone && <div className="text-slate-500">{s.recipient_phone}</div>}
            </div>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">{d.weight}</dt><dd>{s.declared_weight_kg ?? "?"} kg</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">{d.deadline}</dt><dd>{dateNL(s.deadline)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">{d.deliver}</dt><dd>{s.pickup_choice}</dd></div>
              {booking && (
                <div className="flex justify-between"><dt className="text-slate-500">{d.payment}</dt>
                  <dd><Chip tone={booking.payout_status === "RELEASED" ? "ok" : "warn"}>{booking.payout_status === "RELEASED" ? d.released : d.held}</Chip></dd>
                </div>
              )}
            </dl>
            {conv && (
              <Link href={`/app/messages/${conv.id}`} className="ph-btn ph-btn-ghost mt-3 w-full text-sm">{d.open_chat}</Link>
            )}
            {isOwner && s.receipt_code && s.status !== "DELIVERED" && (
              <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-center ring-1 ring-emerald-200">
                <div className="text-xs font-medium text-emerald-700">{d.receipt_code_label}</div>
                <div className="mt-0.5 font-mono text-2xl font-bold tracking-widest text-emerald-800">{s.receipt_code}</div>
                <div className="mt-1 text-[11px] text-emerald-600">{d.receipt_share}</div>
              </div>
            )}
          </section>

          <section className="ph-card p-4">
            <SectionTitle sub={`${d.vol_sub} (÷${VOLUMETRIC_DIVISOR})`}>{d.label}</SectionTitle>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">{d.volumetric}</span>
              <span className="font-medium">{volumetricKg != null ? `${volumetricKg} kg` : "—"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">{d.chargeable}</span>
              <span className="font-semibold">{chargeableKg != null ? `${chargeableKg} kg` : "—"}</span>
            </div>
            <Link href={`/label/${s.id}`} target="_blank" className="ph-btn ph-btn-ghost mt-3 w-full text-sm">{d.open_label}</Link>
          </section>

          {isOps && s.status === "INTAKE" && s.eligibility === "ALLOW" && (
            <section className="ph-card p-4">
              <SectionTitle sub={d.inspection_sub}>{d.inspection}</SectionTitle>
              <form action={submitInspectionAction} className="space-y-2">
                <input type="hidden" name="shipment_id" value={s.id} />
                <div className="grid grid-cols-2 gap-1 text-sm">
                  {checks.map(([k, l]) => (
                    <label key={k} className="flex items-center gap-1.5"><input type="checkbox" name={`chk_${k}`} defaultChecked /> {l}</label>
                  ))}
                </div>
                <input name="seal_no" required placeholder={d.seal_no} className="w-full rounded border border-slate-300 px-2 py-1 text-sm" />
                <textarea name="notes" rows={2} placeholder={d.remarks} className="w-full rounded border border-slate-300 px-2 py-1 text-sm" />
                <div className="flex gap-2">
                  <button name="result" value="PASS" className="ph-btn ph-btn-primary flex-1 text-sm">{d.pass_seal}</button>
                  <button name="result" value="FAIL" className="ph-btn ph-btn-ghost text-sm text-rose-600">{d.fail}</button>
                </div>
              </form>
            </section>
          )}

          {(isOps || isOwner) && nexts.length > 0 && s.eligibility === "ALLOW" && s.status !== "INTAKE" && (
            <section className="ph-card p-4">
              <SectionTitle sub={d.next_step_sub}>{d.next_step}</SectionTitle>
              <div className="space-y-2">
                {nexts.map((n) => (
                  <form key={n.to} action={advanceStatusAction} className="space-y-2 rounded-lg bg-slate-50 p-2">
                    <input type="hidden" name="shipment_id" value={s.id} />
                    <input type="hidden" name="to_status" value={n.to} />
                    <input type="hidden" name="event_type" value={n.event} />
                    {n.needsSeal && (
                      <input name="seal_no" placeholder={d.seal_no} required className="w-full rounded border border-slate-300 px-2 py-1 text-sm" />
                    )}
                    {n.needsReceipt && s.receipt_code && (
                      <>
                        <p className="text-xs text-slate-500">{d.receipt_ask}</p>
                        <input name="receipt_code" inputMode="numeric" placeholder={d.receipt_code_ph} required className="w-full rounded border border-slate-300 px-2 py-1 text-sm tracking-widest" />
                      </>
                    )}
                    <button className="ph-btn ph-btn-primary w-full text-sm">{d[n.key]}</button>
                  </form>
                ))}
              </div>
            </section>
          )}

          {s.status === "DELIVERED" && rateeId && !alreadyRated && (
            <section className="ph-card p-4">
              <SectionTitle sub={m.review.sub}>⭐ {isOwner ? m.review.title_carrier : m.review.title_client}</SectionTitle>
              <form action={submitRatingAction} className="space-y-2">
                <input type="hidden" name="shipment_id" value={s.id} />
                <input type="hidden" name="ratee_id" value={rateeId} />
                <input type="hidden" name="role" value={rateRole} />
                <label className="block text-sm">{m.review.stars_label}
                  <select name="stars" defaultValue="4" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="4">★★★★ (4)</option><option value="3">★★★☆ (3)</option><option value="2">★★☆☆ (2)</option><option value="1">★☆☆☆ (1)</option>
                  </select>
                </label>
                <textarea name="comment" rows={2} placeholder={m.review.comment} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <button className="ph-btn ph-btn-primary w-full text-sm">{m.review.submit}</button>
              </form>
            </section>
          )}

          {isOwner && s.status === "DELIVERED" && (
            <details className="ph-card p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-800">{d.return_open}</summary>
              <form action={requestReturnAction} className="mt-3 space-y-2">
                <input type="hidden" name="shipment_id" value={s.id} />
                <textarea name="reason" rows={2} placeholder={d.return_reason} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                <button className="ph-btn ph-btn-ghost w-full text-sm">{d.return_submit}</button>
              </form>
            </details>
          )}

          {isOwner && ["BOOKED", "INTAKE", "SEALED", "IN_CUSTODY", "IN_TRANSIT", "CUSTOMS", "READY", "DELIVERED"].includes(s.status) && (
            <details className="ph-card p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-800">{d.claim_open}</summary>
              <form action={openClaimAction} className="mt-3 space-y-2">
                <input type="hidden" name="shipment_id" value={s.id} />
                <select name="claim_type" className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
                  <option value="DAMAGE">{d.claim_damage}</option>
                  <option value="LOSS">{d.claim_loss}</option>
                  <option value="DELAY">{d.claim_delay}</option>
                  <option value="MISMATCH">{d.claim_mismatch}</option>
                  <option value="OTHER">{d.claim_other}</option>
                </select>
                <input name="amount_eur" type="number" step="0.01" placeholder={d.claim_amount} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                <textarea name="description" rows={2} required placeholder={d.claim_desc} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                <button className="ph-btn ph-btn-ghost w-full text-sm">{d.claim_submit}</button>
              </form>
            </details>
          )}

          <section className="ph-card p-4">
            <SectionTitle sub={d.history_sub}>{d.history}</SectionTitle>
            <ol className="relative space-y-3 border-l border-slate-200 pl-4">
              {custody.map((c) => (
                <li key={c.seq} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-orange-500 ring-2 ring-white" />
                  <div className="text-sm font-medium text-slate-800">{c.event_type}{c.seal_no ? ` · ${d.seal_l} ${c.seal_no}` : ""}</div>
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
