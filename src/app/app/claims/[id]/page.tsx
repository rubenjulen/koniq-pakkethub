import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession, hasCapability } from "@/lib/auth";
import { query, queryOne } from "@/db/client";
import { Chip, SectionTitle } from "@/components/ui";
import { eur, dateTimeNL } from "@/lib/format";
import { draftSupportReply } from "@/lib/adapters/ai";
import { postClaimMessageAction, resolveClaimAction } from "../actions";
import { getMessages } from "@/i18n";

export const metadata = { title: "Claim" };

export default async function ClaimDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSession();
  const { id } = await params;
  const cl = (await getMessages()).claims;
  const isOps = hasCapability(user, "ops.review");

  const c = await queryOne<any>(
    `SELECT c.*, c.amount_eur::float8 AS amount, s.reference, s.id AS shipment_id, u.name AS opened_by
       FROM claims c JOIN shipments s ON s.id=c.shipment_id LEFT JOIN users u ON u.id=c.opened_by
      WHERE c.id=$1 AND c.tenant_id=$2`,
    [id, user.tenantId]
  );
  if (!c) notFound();

  const messages = await query<any>(
    `SELECT cm.body, cm.created_at, u.name AS sender FROM claim_messages cm LEFT JOIN users u ON u.id=cm.sender_id
      WHERE cm.claim_id=$1 ORDER BY cm.created_at`, [id]
  );
  const aiDraft = draftSupportReply({ subject: c.description ?? c.claim_type, kind: c.claim_type });
  const open = c.status === "OPEN" || c.status === "INVESTIGATING";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link href="/app/claims" className="text-sm text-orange-600 hover:underline">← {cl.title.replace(/^🛟\s*/, "")}</Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="font-mono text-xl font-bold text-slate-900">{c.reference}</h1>
          <Chip>{c.claim_type}</Chip>
          <Chip tone={c.status === "RESOLVED" ? "ok" : c.status === "REJECTED" ? "bad" : "warn"}>{c.status}</Chip>
        </div>
        <p className="text-sm text-slate-500">{cl.opened_by} {c.opened_by} · {dateTimeNL(c.created_at)}{c.amount ? ` · ${cl.claimed_amt} ${eur(c.amount)}` : ""}</p>
      </div>

      <section className="ph-card p-4">
        <SectionTitle>{cl.description}</SectionTitle>
        <p className="text-sm text-slate-700">{c.description}</p>
        {c.resolution && (
          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
            <span className="font-semibold text-slate-700">{cl.outcome}</span> {c.resolution}
          </div>
        )}
        <Link href={`/app/shipments/${c.shipment_id}`} className="mt-3 inline-block text-sm text-orange-600 hover:underline">{cl.view_shipment}</Link>
      </section>

      <section className="ph-card p-4">
        <SectionTitle sub={cl.messages_sub}>{cl.messages}</SectionTitle>
        <div className="space-y-2">
          {messages.length === 0 && <p className="text-sm text-slate-400">{cl.no_msg}</p>}
          {messages.map((m, i) => (
            <div key={i} className="rounded-lg bg-slate-50 p-2 text-sm">
              <div className="text-xs font-semibold text-slate-600">{m.sender ?? "PakketHub"}</div>
              <div className="text-slate-700">{m.body}</div>
            </div>
          ))}
        </div>
        {open && (
          <form action={postClaimMessageAction} className="mt-3 flex gap-2">
            <input type="hidden" name="claim_id" value={id} />
            <input name="body" placeholder={cl.reply_ph} required
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500" />
            <button className="ph-btn ph-btn-primary text-sm">{cl.send}</button>
          </form>
        )}
      </section>

      {isOps && open && (
        <section className="ph-card p-4">
          <SectionTitle sub={cl.review_ops_sub}>{cl.review_ops}</SectionTitle>
          <div className="mb-3 rounded-lg bg-orange-50 p-3 text-xs text-orange-800">
            <div className="mb-1 font-semibold">{cl.ai_draft}</div>
            {aiDraft}
          </div>
          <form action={resolveClaimAction} className="space-y-3">
            <input type="hidden" name="claim_id" value={id} />
            <textarea name="resolution" rows={2} placeholder={cl.reason_ph}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500" />
            <div className="flex flex-wrap gap-2">
              <button name="outcome" value="REFUND" className="ph-btn ph-btn-primary text-sm">{cl.grant}</button>
              <button name="outcome" value="INVESTIGATE" className="ph-btn ph-btn-ghost text-sm">{cl.investigate}</button>
              <button name="outcome" value="REJECT" className="ph-btn ph-btn-ghost text-sm text-rose-600">{cl.reject}</button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
