import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getIntent } from "@/lib/adapters/payments";
import { queryOne } from "@/db/client";
import { eur } from "@/lib/format";
import { computeFee } from "@/lib/finance";
import { PROVIDERS } from "@/lib/adapters/config";
import { confirmPaymentAction } from "../actions";
import { Chip } from "@/components/ui";
import { getMessages } from "@/i18n";

export const metadata = { title: "Betalen" };

export default async function PayPage({ params, searchParams }: { params: Promise<{ intentId: string }>; searchParams: Promise<{ failed?: string }> }) {
  const user = await requireSession();
  const { intentId } = await params;
  const { failed } = await searchParams;
  const t = (await getMessages()).pay;

  const intent = await getIntent(intentId);
  if (!intent || intent.tenant_id !== user.tenantId) notFound();

  const b = await queryOne<any>(
    `SELECT bk.agreed_price_eur::float8 AS price, s.reference, s.recipient_city
       FROM bookings bk JOIN shipments s ON s.id=bk.shipment_id WHERE bk.id=$1`,
    [intent.reference_id]
  );
  const price = b?.price ?? 0;
  const fee = computeFee(price);
  const done = intent.status === "SUCCEEDED";

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="ph-card overflow-hidden">
        <div className="flex items-center justify-between bg-slate-900 px-5 py-3 text-white">
          <span className="font-semibold">{t.secure}</span>
          <Chip tone="ok">{t.sandbox}</Chip>
        </div>
        <div className="p-5">
          <div className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-200">
            <strong>{t.sim_badge}</strong> {t.sim_note.replace("{p}", PROVIDERS.payments.name)}
          </div>

          <div className="text-sm text-slate-500">{t.payment_for}</div>
          <div className="font-mono text-lg font-bold text-slate-900">{b?.reference}</div>
          <div className="text-sm text-slate-500">{t.delivery_in} {b?.recipient_city}</div>

          <dl className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">{t.carrier_fee}</dt><dd>{eur(price)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">{t.service_fee}</dt><dd>{eur(fee)}</dd></div>
            <div className="mt-1 flex justify-between border-t border-slate-100 pt-2 text-base font-bold text-slate-900">
              <dt>{t.total}</dt><dd>{eur(intent.amount_eur)}</dd>
            </div>
          </dl>

          <div className="mt-3 rounded-lg bg-orange-50 p-3 text-xs text-orange-800">
            {t.escrow_note}
          </div>

          {failed && (
            <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
              {t.failed}
            </div>
          )}

          {done ? (
            <div className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-center text-sm font-medium text-orange-700">{t.success}</div>
          ) : (
            <div className="mt-4 grid gap-2">
              <form action={confirmPaymentAction}>
                <input type="hidden" name="intent_id" value={intentId} />
                <input type="hidden" name="outcome" value="success" />
                <button className="ph-btn ph-btn-primary w-full">{t.pay_btn.replace("{a}", eur(intent.amount_eur))}</button>
              </form>
              <form action={confirmPaymentAction}>
                <input type="hidden" name="intent_id" value={intentId} />
                <input type="hidden" name="outcome" value="fail" />
                <button className="ph-btn ph-btn-ghost w-full text-slate-500">{t.fail_btn}</button>
              </form>
            </div>
          )}
        </div>
      </div>
      <p className="text-center text-xs text-slate-400">{t.provider_line.replace("{n}", PROVIDERS.payments.name).replace("{m}", PROVIDERS.payments.mode)}</p>
    </div>
  );
}
