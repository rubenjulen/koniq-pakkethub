import { NextResponse } from "next/server";
import { authApiKey } from "@/lib/apikey";
import { getCategoryMap, getCorridors } from "@/lib/tenant";
import { evaluateEligibility, RULE_VERSION } from "@/lib/eligibility";
import { computeFee } from "@/lib/finance";

/**
 * Publieke API — indicatieve quote + eligibility voor zakelijke integraties.
 * Auth: Authorization: Bearer <api_key>. Scope: 'quote'.
 */
export async function POST(req: Request) {
  const auth = await authApiKey(req, "quote");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const items = Array.isArray(body.items) ? body.items : [];
  const weight = body.weight_kg != null ? Number(body.weight_kg) : null;

  const corridors = await getCorridors(auth.tenantId);
  const corridor = corridors.find((c) => c.code === body.corridor) ?? corridors.find((c) => c.status === "PILOT") ?? corridors[0];
  const categories = await getCategoryMap(auth.tenantId);

  const result = evaluateEligibility({
    items: items.map((i: any) => ({
      description: String(i.description ?? ""), quantity: Number(i.quantity ?? 1),
      unit_value: Number(i.unit_value ?? 0), category_code: String(i.category_code ?? "UNKNOWN"),
    })),
    isSealedClosed: Boolean(body.sealed),
    declaredWeightKg: weight,
    corridor, categories, senderKycVerified: true,
  });

  const kg = weight ?? 0;
  const priceLow = Math.round((5 + kg * 5.5) * 100) / 100;
  const priceHigh = Math.round((8 + kg * 8) * 100) / 100;

  return NextResponse.json({
    corridor: corridor.code,
    rule_version: RULE_VERSION,
    eligibility: result.decision,
    reasons: result.reasons,
    total_declared_value_eur: result.totalValueEur,
    price_estimate_eur: result.decision === "ALLOW" ? { low: priceLow, high: priceHigh, platform_fee: computeFee(priceLow) } : null,
  });
}
