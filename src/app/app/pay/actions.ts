"use server";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getIntent } from "@/lib/adapters/payments";
import { settleCharge } from "@/lib/finance";
import { queryOne, query } from "@/db/client";

export async function confirmPaymentAction(formData: FormData) {
  const user = await requireSession();
  const intentId = String(formData.get("intent_id") ?? "");
  const success = String(formData.get("outcome") ?? "") === "success";
  const method = String(formData.get("method") ?? "") || null; // CASH_WU|CARD|CRYPTO

  const intent = await getIntent(intentId);
  if (!intent || intent.tenant_id !== user.tenantId) redirect("/app");
  // Alleen de betalende afzender mag bevestigen.
  if (intent.payer_id && intent.payer_id !== user.id) redirect("/app");

  if (method) await query(`UPDATE payment_intents SET method=$1 WHERE id=$2`, [method, intentId]);
  await settleCharge(user.tenantId, intentId, success);

  const booking = await queryOne<{ shipment_id: string }>(
    `SELECT shipment_id FROM bookings WHERE id=$1`, [intent.reference_id]
  );
  if (!success) redirect(`/app/pay/${intentId}?failed=1`);
  redirect(`/app/shipments/${booking?.shipment_id ?? ""}`);
}
