import { requireSession, hasCapability } from "@/lib/auth";
import { query } from "@/db/client";
import { EmptyState, Chip, SectionTitle } from "@/components/ui";
import { eur, timeAgo } from "@/lib/format";
import { createShoppingRequestAction, claimShoppingRequestAction, markPurchasedAction } from "./actions";

export const metadata = { title: "Shop-verzoeken" };

const TONE: Record<string, "ok" | "warn" | "neutral"> = { OPEN: "warn", CLAIMED: "warn", PURCHASED: "ok", DELIVERED: "ok", CANCELLED: "neutral" };

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const user = await requireSession();
  const { ok } = await searchParams;
  const isTraveler = hasCapability(user, "offer.create");
  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500";

  const rows = await query<any>(
    `SELECT sr.id, sr.product_name, sr.product_url, sr.quantity, sr.budget_eur::float8 AS budget,
            sr.reward_eur::float8 AS reward, sr.category_code, sr.notes, sr.status, sr.requester_id, sr.claimed_by, sr.created_at,
            ru.name AS requester, cu.name AS claimer,
            pt.status AS task_status
       FROM shopping_requests sr
       LEFT JOIN users ru ON ru.id=sr.requester_id
       LEFT JOIN users cu ON cu.id=sr.claimed_by
       LEFT JOIN purchase_tasks pt ON pt.shopping_request_id=sr.id
      WHERE sr.tenant_id=$1 ORDER BY sr.created_at DESC`,
    [user.tenantId]
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">🛒 Shop-verzoeken (jastip)</h1>
        <p className="text-sm text-slate-500">Vraag een reiziger om een product voor je te kopen en mee te nemen — met bonnetje als bewijs.</p>
      </div>

      <section className="ph-card p-4">
        <SectionTitle sub="De categorie wordt automatisch voorgesteld (AI)">Nieuw verzoek</SectionTitle>
        {ok && <div className="mb-3 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700 ring-1 ring-orange-200">Verzoek geplaatst.</div>}
        <form action={createShoppingRequestAction} className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2"><span className="text-xs font-medium text-slate-600">Product *</span><input name="product_name" required className={inp} placeholder="Bijv. Venco muntdrop 2×" /></label>
          <label className="block sm:col-span-2"><span className="text-xs font-medium text-slate-600">Link (optioneel)</span><input name="product_url" className={inp} placeholder="https://…" /></label>
          <label className="block"><span className="text-xs font-medium text-slate-600">Aantal</span><input name="quantity" type="number" min="1" defaultValue="1" className={inp} /></label>
          <label className="block"><span className="text-xs font-medium text-slate-600">Budget €</span><input name="budget_eur" type="number" step="0.5" className={inp} /></label>
          <label className="block"><span className="text-xs font-medium text-slate-600">Vergoeding reiziger €</span><input name="reward_eur" type="number" step="0.5" className={inp} /></label>
          <label className="block"><span className="text-xs font-medium text-slate-600">Notitie</span><input name="notes" className={inp} /></label>
          <div className="sm:col-span-2"><button className="ph-btn ph-btn-primary">Verzoek plaatsen</button></div>
        </form>
      </section>

      <section>
        <SectionTitle>Verzoeken</SectionTitle>
        {rows.length === 0 ? (
          <EmptyState icon="🛍️" title="Nog geen verzoeken" />
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const mine = r.requester_id === user.id;
              const claimedByMe = r.claimed_by === user.id;
              return (
                <div key={r.id} className="ph-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{r.quantity}× {r.product_name}</span>
                        <Chip>{r.category_code}</Chip>
                      </div>
                      <div className="text-xs text-slate-500">
                        {mine ? "Jij" : r.requester} · budget {r.budget ? eur(r.budget) : "—"} · vergoeding {r.reward ? eur(r.reward) : "—"} · {timeAgo(r.created_at)}
                      </div>
                      {r.notes && <div className="mt-1 text-xs text-slate-500">{r.notes}</div>}
                    </div>
                    <Chip tone={TONE[r.status] ?? "neutral"}>{r.status}</Chip>
                  </div>

                  {/* Traveler kan een open verzoek claimen */}
                  {isTraveler && !mine && r.status === "OPEN" && (
                    <form action={claimShoppingRequestAction} className="mt-3">
                      <input type="hidden" name="request_id" value={r.id} />
                      <button className="ph-btn ph-btn-primary text-xs">Ik koop dit</button>
                    </form>
                  )}

                  {/* Geclaimde reiziger meldt aankoop + bon */}
                  {claimedByMe && r.status === "CLAIMED" && (
                    <form action={markPurchasedAction} className="mt-3 grid gap-2 sm:grid-cols-[1fr_120px_auto]">
                      <input type="hidden" name="request_id" value={r.id} />
                      <input name="receipt_ref" placeholder="Bonnummer" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                      <input name="amount_paid_eur" type="number" step="0.01" placeholder="Betaald €" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                      <button className="ph-btn ph-btn-primary text-xs">Aankoop bevestigen</button>
                    </form>
                  )}
                  {r.claimed_by && <div className="mt-2 text-xs text-slate-400">Reiziger: {claimedByMe ? "jij" : r.claimer}{r.task_status ? ` · ${r.task_status}` : ""}</div>}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
