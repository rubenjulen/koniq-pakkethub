import { NextResponse } from "next/server";
import { authApiKey } from "@/lib/apikey";
import { query, queryOne } from "@/db/client";

/** Publieke API — beperkte tracking op referentie. Scope: 'tracking'. */
export async function GET(req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const auth = await authApiKey(req, "tracking");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { ref } = await params;

  const s = await queryOne<any>(
    `SELECT id, reference, status, service_mode, recipient_city, recipient_country
       FROM shipments WHERE tenant_id=$1 AND upper(reference)=upper($2)`,
    [auth.tenantId, ref]
  );
  if (!s) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const events = await query<any>(
    `SELECT event_type, created_at FROM custody_events WHERE shipment_id=$1 ORDER BY seq`, [s.id]
  );
  return NextResponse.json({
    reference: s.reference, status: s.status, service_mode: s.service_mode,
    destination: { city: s.recipient_city, country: s.recipient_country },
    events: events.map((e) => ({ type: e.event_type, at: e.created_at })),
  });
}
