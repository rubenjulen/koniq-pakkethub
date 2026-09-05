// Fire-and-forget event-ingestie voor lichte product-analytics.
// Slaat niet-transactionele acties op (page_view, check_used, widget-kliks).
// Faalt nooit hard richting de client — analytics mag de UX niet verstoren.
import { getTenantId } from "@/lib/tenant";
import { getSession } from "@/lib/auth";
import { query } from "@/db/client";

export const dynamic = "force-dynamic";

const NAME_RE = /^[a-z][a-z0-9_]{1,39}$/;

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    if (raw.length > 4000) return new Response(null, { status: 204 });
    const body = JSON.parse(raw || "{}");
    const name = String(body.name ?? "");
    if (!NAME_RE.test(name)) return new Response(null, { status: 204 });

    const path = typeof body.path === "string" && body.path.startsWith("/") ? body.path.slice(0, 300) : null;
    let props = "{}";
    if (body.props && typeof body.props === "object") {
      const s = JSON.stringify(body.props);
      if (s.length <= 2000) props = s;
    }

    const tenantId = await getTenantId().catch(() => null);
    const session = await getSession().catch(() => null);

    await query(
      `INSERT INTO events (tenant_id, user_id, name, path, props) VALUES ($1,$2,$3,$4,$5::jsonb)`,
      [tenantId, session?.id ?? null, name, path, props]
    );
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 204 });
  }
}
