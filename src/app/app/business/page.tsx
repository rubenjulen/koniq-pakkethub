import { cookies } from "next/headers";
import { requireCapability } from "@/lib/auth";
import { query, queryOne } from "@/db/client";
import { Chip, SectionTitle, EmptyState } from "@/components/ui";
import { eur, timeAgo, dateTimeNL } from "@/lib/format";
import { createApiKeyAction, revokeApiKeyAction, createWebhookAction, testWebhookAction } from "./actions";

export const metadata = { title: "Business & API" };

export default async function BusinessPage({ searchParams }: { searchParams: Promise<{ created?: string; tested?: string }> }) {
  const user = await requireCapability("control.view");
  const t = user.tenantId;
  const { created, tested } = await searchParams;

  const jar = await cookies();
  const newKey = jar.get("ph_new_key")?.value ?? null;

  const biz = await queryOne<any>(`SELECT id, name, vat_number, credit_limit_eur::float8 AS credit FROM business_accounts WHERE tenant_id=$1 ORDER BY created_at LIMIT 1`, [t]);
  const keys = await query<any>(`SELECT id, label, prefix, scopes, last_used_at, revoked, created_at FROM api_keys WHERE tenant_id=$1 ORDER BY created_at DESC`, [t]);
  const hooks = await query<any>(`SELECT id, url, events, active FROM webhooks WHERE tenant_id=$1 ORDER BY created_at DESC`, [t]);
  const deliveries = await query<any>(`SELECT event, status, response_code, created_at FROM webhook_deliveries WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 8`, [t]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">🏢 Business & API</h1>
        <p className="text-sm text-slate-500">Zakelijke accounts, API-sleutels en webhooks (R2 Merchant/API)</p>
      </div>

      {biz && (
        <section className="ph-card p-4">
          <SectionTitle>Zakelijk account</SectionTitle>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <span className="font-semibold text-slate-800">{biz.name}</span>
            <span className="text-slate-500">BTW: {biz.vat_number}</span>
            <span className="text-slate-500">Kredietlimiet: {eur(biz.credit)}</span>
          </div>
        </section>
      )}

      {newKey && (
        <div className="rounded-xl bg-orange-50 p-4 text-sm ring-1 ring-orange-200">
          <div className="font-semibold text-orange-800">Nieuwe API-sleutel — kopieer nu, wordt maar één keer getoond:</div>
          <code className="mt-1 block break-all rounded bg-white px-2 py-1 font-mono text-orange-900">{newKey}</code>
        </div>
      )}
      {tested && <div className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700 ring-1 ring-orange-200">Testgebeurtenis verstuurd — zie deliveries hieronder.</div>}

      {/* API keys */}
      <section className="ph-card p-4">
        <div className="flex items-center justify-between">
          <SectionTitle sub="Authenticatie voor de publieke API">API-sleutels</SectionTitle>
          <form action={createApiKeyAction} className="flex gap-2">
            <input name="label" placeholder="Label" className="rounded-lg border border-slate-300 px-2 py-1 text-sm" />
            <button className="ph-btn ph-btn-primary text-sm">+ Sleutel</button>
          </form>
        </div>
        <div className="mt-2 divide-y divide-slate-100">
          {keys.map((k: any) => (
            <div key={k.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <span className="font-mono font-semibold text-slate-800">{k.prefix}_••••</span>
                <span className="ml-2 text-slate-500">{k.label} · {k.scopes.join(", ")}</span>
                <span className="ml-2 text-xs text-slate-400">{k.last_used_at ? `laatst gebruikt ${timeAgo(k.last_used_at)}` : "nog niet gebruikt"}</span>
              </div>
              {k.revoked ? <Chip tone="bad">ingetrokken</Chip> : (
                <form action={revokeApiKeyAction}><input type="hidden" name="key_id" value={k.id} /><button className="text-xs text-rose-500 hover:underline">Intrekken</button></form>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* API docs */}
      <section className="ph-card p-4">
        <SectionTitle sub="Test direct met de sandbox-sleutel">API-voorbeeld</SectionTitle>
        <p className="mb-2 text-xs text-slate-500">Demo-sleutel: <code className="rounded bg-slate-100 px-1 font-mono">pk_sandbox_pakkethub_demo_key_2026</code></p>
        <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">{`curl -X POST http://localhost:3070/api/v1/quote \\
  -H "Authorization: Bearer pk_sandbox_pakkethub_demo_key_2026" \\
  -H "Content-Type: application/json" \\
  -d '{"corridor":"NL-SR","weight_kg":3,
       "items":[{"description":"kleding","quantity":2,"unit_value":25,"category_code":"CLOTHING"}]}'

curl http://localhost:3070/api/v1/track/PH-2026-000101 \\
  -H "Authorization: Bearer pk_sandbox_pakkethub_demo_key_2026"`}</pre>
      </section>

      {/* Webhooks */}
      <section className="ph-card p-4">
        <div className="flex items-center justify-between">
          <SectionTitle sub="Ontvang events bij statuswijziging, boeking en uitbetaling">Webhooks</SectionTitle>
          <form action={testWebhookAction}><button className="ph-btn ph-btn-ghost text-sm">Test-event sturen</button></form>
        </div>
        <form action={createWebhookAction} className="mb-3 flex flex-wrap gap-2">
          <input name="url" placeholder="https://jouw-endpoint/webhook" className="min-w-56 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="events" value="shipment.status" defaultChecked /> status</label>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="events" value="payout.released" /> payout</label>
          <button className="ph-btn ph-btn-primary text-sm">+ Webhook</button>
        </form>
        {hooks.map((h: any) => (
          <div key={h.id} className="flex items-center justify-between py-1 text-sm">
            <span className="truncate font-mono text-slate-700">{h.url}</span>
            <span className="flex items-center gap-2"><span className="text-xs text-slate-400">{h.events.join(", ")}</span><Chip tone={h.active ? "ok" : "neutral"}>{h.active ? "actief" : "uit"}</Chip></span>
          </div>
        ))}

        <div className="mt-3 border-t border-slate-100 pt-2">
          <div className="mb-1 text-xs font-semibold text-slate-500">Recente deliveries (simulatie)</div>
          {deliveries.length === 0 ? <p className="text-xs text-slate-400">Nog geen deliveries.</p> :
            deliveries.map((d: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-0.5 text-xs">
                <span className="text-slate-600">{d.event}</span>
                <span className="text-slate-400">{d.status} {d.response_code} · {dateTimeNL(d.created_at)}</span>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
