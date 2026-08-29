import { requireSession, hasCapability } from "@/lib/auth";
import { query, queryOne } from "@/db/client";
import { walletBalance, accountBalance } from "@/lib/finance";
import { StatCard, EmptyState, SectionTitle, Chip } from "@/components/ui";
import { eur, dateTimeNL } from "@/lib/format";
import { getMessages } from "@/i18n";

export const metadata = { title: "Wallet & betalingen" };

const STATUS_TONE: Record<string, "ok" | "warn" | "bad" | "neutral"> = {
  SUCCEEDED: "ok", REQUIRES_ACTION: "warn", PROCESSING: "warn", FAILED: "bad", REFUNDED: "neutral",
};

export default async function WalletPage() {
  const user = await requireSession();
  const t = user.tenantId;
  const w = (await getMessages()).wallet;
  const balance = await walletBalance(t, user.id);
  const isAdmin = hasCapability(user, "control.view");
  const PURPOSE_LABEL: Record<string, string> = { CHARGE: w.charge, PAYOUT: w.payout, REFUND: w.refund };

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

  const wp = await queryOne<any>(`SELECT points, payout_threshold_eur::float8 AS threshold FROM wallets WHERE tenant_id=$1 AND user_id=$2`, [t, user.id]);
  const points = wp?.points ?? 0;
  const threshold = wp?.threshold ?? 500;
  const progress = Math.min(100, threshold > 0 ? Math.max(0, (balance / threshold) * 100) : 0);
  const remaining = Math.max(0, threshold - balance);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-bold text-slate-900">{w.title}</h1>

      {/* Punten/coins + uitbetaaldrempel (feature 9) */}
      <section className="ph-card p-5">
        <SectionTitle sub={w.points_sub}>🪙 {w.points}</SectionTitle>
        <div className="flex items-end justify-between">
          <div className="text-3xl font-bold text-slate-900">{points} <span className="text-base font-medium text-slate-400">{w.coins}</span></div>
          <div className="text-right text-sm"><div className="text-slate-400">{w.threshold}</div><div className="font-semibold text-slate-800">{eur(threshold)}</div></div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-orange-500" style={{ width: `${progress}%` }} /></div>
        <div className="mt-1 text-xs font-medium text-slate-500">{balance >= threshold ? w.payout_ready : w.to_payout.replace("{x}", eur(remaining))}</div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label={w.balance} value={eur(balance)} hint={w.balance_hint} />
        {isAdmin && <StatCard label={w.escrow} value={eur(escrow)} hint={w.escrow_hint} />}
        {isAdmin && <StatCard label={w.fees} value={eur(fees)} hint={w.fees_hint} />}
      </div>

      <section>
        <SectionTitle sub={w.transactions_sub}>{w.transactions}</SectionTitle>
        {intents.length === 0 ? (
          <EmptyState icon="🧾" title={w.no_tx}>{w.no_tx_d}</EmptyState>
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
          <SectionTitle sub={w.history_sub}>{w.history}</SectionTitle>
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

      <p className="text-xs text-slate-400">{w.note}</p>
    </div>
  );
}
