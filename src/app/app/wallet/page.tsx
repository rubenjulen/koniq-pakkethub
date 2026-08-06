import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { query } from "@/db/client";
import { walletBalance, accountBalance } from "@/lib/finance";
import { hasCapability } from "@/lib/auth";
import { StatCard, EmptyState, SectionTitle, Chip } from "@/components/ui";
import { eur, dateTimeNL } from "@/lib/format";

export const metadata = { title: "Wallet & betalingen" };

const STATUS_TONE: Record<string, "ok" | "warn" | "bad" | "neutral"> = {
  SUCCEEDED: "ok", REQUIRES_ACTION: "warn", PROCESSING: "warn", FAILED: "bad", REFUNDED: "neutral",
};
const PURPOSE_LABEL: Record<string, string> = { CHARGE: "Betaling", PAYOUT: "Uitbetaling", REFUND: "Terugboeking" };

export default async function WalletPage() {
  const user = await requireSession();
  const t = user.tenantId;
  const balance = await walletBalance(t, user.id);
  const isAdmin = hasCapability(user, "control.view");

  const intents = await query<any>(
    `SELECT id, purpose, amount_eur::float8 AS amount, currency, status, description, reference_id, created_at,
            (payer_id=$2) AS outgoing
       FROM payment_intents
      WHERE tenant_id=$1 AND (payer_id=$2 OR payee_id=$2)
      ORDER BY created_at DESC LIMIT 30`,
    [t, user.id]
  );
  const ledger = await query<any>(
    `SELECT direction, amount_eur::float8 AS amount, memo, created_at
       FROM ledger_entries WHERE tenant_id=$1 AND account=$2 ORDER BY id DESC LIMIT 20`,
    [t, `WALLET:${user.id}`]
  );

  const escrow = isAdmin ? await accountBalance(t, "ESCROW") : 0;
  const fees = isAdmin ? await accountBalance(t, "PLATFORM_FEE") : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-bold text-slate-900">💶 Wallet & betalingen</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Wallet-saldo" value={eur(balance)} hint="Uitbetaalde verdiensten" />
        {isAdmin && <StatCard label="In bewaring (escrow)" value={eur(escrow)} hint="Platform-breed" />}
        {isAdmin && <StatCard label="Servicekosten (fees)" value={eur(fees)} hint="Platform-omzet" />}
      </div>

      <section>
        <SectionTitle sub="Betalingen, uitbetalingen en terugboekingen">Transacties</SectionTitle>
        {intents.length === 0 ? (
          <EmptyState icon="🧾" title="Nog geen transacties">Zodra je boekt of uitbetaald wordt, zie je het hier.</EmptyState>
        ) : (
          <div className="ph-card divide-y divide-slate-100">
            {intents.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    {PURPOSE_LABEL[i.purpose] ?? i.purpose}
                    <Chip tone={STATUS_TONE[i.status] ?? "neutral"}>{i.status}</Chip>
                  </div>
                  <div className="truncate text-xs text-slate-500">{i.description} · {dateTimeNL(i.created_at)}</div>
                </div>
                <div className={`shrink-0 font-semibold ${i.outgoing ? "text-slate-700" : "text-orange-600"}`}>
                  {i.outgoing ? "−" : "+"}{eur(i.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {ledger.length > 0 && (
        <section>
          <SectionTitle sub="Grootboekmutaties op je wallet">Wallet-historie</SectionTitle>
          <div className="ph-card divide-y divide-slate-100 text-sm">
            {ledger.map((l, i) => (
              <div key={i} className="flex items-center justify-between p-3">
                <span className="text-slate-600">{l.memo}</span>
                <span className={l.direction === "CREDIT" ? "font-semibold text-orange-600" : "text-slate-500"}>
                  {l.direction === "CREDIT" ? "+" : "−"}{eur(l.amount)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="text-xs text-slate-400">
        Betalingen lopen via {" "}
        <Link href="/app/console" className="text-orange-600 hover:underline">de simulatie-adapter</Link>.
        Bij livegang koppelt PakketHub een gelicentieerde betaal-/escrow-partij.
      </p>
    </div>
  );
}
