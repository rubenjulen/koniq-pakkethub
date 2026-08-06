import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { queryOne } from "@/db/client";
import { Chip, SectionTitle } from "@/components/ui";
import { getMessages } from "@/i18n";
import { parseBulkAction, commitBulkAction } from "./actions";
import type { BulkRow } from "@/lib/bulk";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bulk-upload" };

export default async function BulkPage({ searchParams }: { searchParams: Promise<{ upload?: string; created?: string }> }) {
  const user = await requireSession();
  const t = (await getMessages()).bulk;
  const sp = await searchParams;

  const upload = sp.upload
    ? await queryOne<any>(`SELECT id, status, total_rows, ok_rows, error_rows, rows FROM bulk_uploads WHERE id=$1 AND tenant_id=$2`, [sp.upload, user.tenantId])
    : null;
  const rows: BulkRow[] = upload ? (Array.isArray(upload.rows) ? upload.rows : JSON.parse(upload.rows)) : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">📤 {t.title}</h1>
        <p className="text-sm text-slate-500">{t.sub}</p>
      </div>

      {sp.created && (
        <div className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700 ring-1 ring-orange-200">
          {t.committed} ({sp.created}) — <Link href="/app/shipments" className="underline">{"→"}</Link>
        </div>
      )}

      <section className="ph-card p-5">
        <SectionTitle sub={t.format_hint}>{t.paste_label}</SectionTitle>
        <form action={parseBulkAction} className="space-y-3">
          <textarea name="csv" rows={7} placeholder={t.paste_ph}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
          <button className="ph-btn ph-btn-primary">{t.parse}</button>
        </form>
      </section>

      {upload && (
        <section className="ph-card p-5">
          <div className="mb-2 flex items-center justify-between">
            <SectionTitle>{t.preview}</SectionTitle>
            <div className="flex gap-2 text-sm">
              <Chip tone="ok">{upload.ok_rows} {t.valid}</Chip>
              {upload.error_rows > 0 && <Chip tone="bad">{upload.error_rows} {t.invalid}</Chip>}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase text-slate-400">
                <th className="py-1">{t.row}</th><th>📦</th><th>kg</th><th>€</th><th></th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.row_no} className={r.ok ? "" : "bg-rose-50/50"}>
                    <td className="py-1.5 text-slate-400">{r.row_no}</td>
                    <td>
                      <div className="font-medium text-slate-800">{r.name || "—"}</div>
                      <div className="text-xs text-slate-500">{[r.city, r.country].filter(Boolean).join(", ")} · {r.description}</div>
                    </td>
                    <td>{r.weight ?? "—"}</td>
                    <td>{r.value != null ? `€${r.value}` : "—"}</td>
                    <td>{r.ok ? <span className="text-orange-600">✓</span> : <span className="text-rose-600" title={r.error ?? ""}>✕ {r.error}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {upload.status === "COMMITTED" ? (
            <p className="mt-3 text-sm text-orange-700">{t.committed}</p>
          ) : upload.ok_rows > 0 ? (
            <form action={commitBulkAction} className="mt-3 flex items-center gap-2">
              <input type="hidden" name="upload_id" value={upload.id} />
              <button className="ph-btn ph-btn-primary">{t.commit} ({upload.ok_rows})</button>
              <Link href="/app/bulk" className="ph-btn ph-btn-ghost text-sm">{t.reset}</Link>
            </form>
          ) : null}
        </section>
      )}
    </div>
  );
}
