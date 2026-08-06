import Link from "next/link";
import { requireSession, hasCapability } from "@/lib/auth";
import { query } from "@/db/client";
import { EmptyState, Chip, SectionTitle } from "@/components/ui";
import { timeAgo } from "@/lib/format";

export const metadata = { title: "Claims & retour" };

const TONE: Record<string, "ok" | "warn" | "bad" | "neutral"> = {
  RESOLVED: "ok", OPEN: "warn", INVESTIGATING: "warn", REJECTED: "bad",
};

export default async function ClaimsPage() {
  const user = await requireSession();
  const isOps = hasCapability(user, "ops.review");
  const rows = await query<any>(
    `SELECT c.id, c.claim_type, c.status, c.description, c.amount_eur::float8 AS amount, c.created_at,
            s.reference, u.name AS opened_by
       FROM claims c JOIN shipments s ON s.id=c.shipment_id LEFT JOIN users u ON u.id=c.opened_by
      WHERE c.tenant_id=$1 ${isOps ? "" : "AND (c.opened_by=$2 OR s.sender_id=$2)"}
      ORDER BY c.created_at DESC`,
    isOps ? [user.tenantId] : [user.tenantId, user.id]
  );
  const returns = await query<any>(
    `SELECT r.id, r.reason, r.status, r.created_at, s.reference
       FROM returns r JOIN shipments s ON s.id=r.shipment_id
      WHERE r.tenant_id=$1 ${isOps ? "" : "AND s.sender_id=$2"}
      ORDER BY r.created_at DESC`,
    isOps ? [user.tenantId] : [user.tenantId, user.id]
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">🛟 Claims & retour</h1>
        <p className="text-sm text-slate-500">{isOps ? "Alle claims" : "Jouw claims"} · schade, verlies, vertraging of afwijkende inhoud</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="✅" title="Geen claims">
          Open een claim vanaf een zending als er iets mis is. Je betaling blijft dan vastgehouden.
        </EmptyState>
      ) : (
        <div className="ph-card divide-y divide-slate-100">
          {rows.map((c) => (
            <Link key={c.id} href={`/app/claims/${c.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-slate-50">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-slate-800">{c.reference}</span>
                  <Chip>{c.claim_type}</Chip>
                </div>
                <div className="truncate text-xs text-slate-500">{c.description} · {isOps ? c.opened_by : "jij"} · {timeAgo(c.created_at)}</div>
              </div>
              <Chip tone={TONE[c.status] ?? "neutral"}>{c.status}</Chip>
            </Link>
          ))}
        </div>
      )}

      {returns.length > 0 && (
        <section>
          <SectionTitle sub="Aangevraagde retourzendingen">Retouren</SectionTitle>
          <div className="ph-card divide-y divide-slate-100">
            {returns.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <span className="font-mono text-sm font-semibold text-slate-800">{r.reference}</span>
                  <div className="truncate text-xs text-slate-500">{r.reason || "—"}</div>
                </div>
                <Chip tone={r.status === "COMPLETED" ? "ok" : r.status === "REJECTED" ? "bad" : "warn"}>{r.status}</Chip>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
