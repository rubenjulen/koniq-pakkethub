"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { query, queryOne } from "@/db/client";
import { walletBalance } from "@/lib/finance";

export async function requestPayoutAction() {
  const user = await requireSession();
  const t = user.tenantId;
  const balance = await walletBalance(t, user.id);
  const wp = await queryOne<any>(
    `SELECT payout_threshold_eur::float8 AS threshold FROM wallets WHERE tenant_id=$1 AND user_id=$2`,
    [t, user.id]
  );
  const threshold = wp?.threshold ?? 500;

  const pending = await queryOne<any>(
    `SELECT id FROM payout_requests WHERE tenant_id=$1 AND user_id=$2 AND status='REQUESTED' LIMIT 1`,
    [t, user.id]
  );
  if (pending || balance < threshold) redirect("/app/wallet");

  await query(
    `INSERT INTO payout_requests (tenant_id, user_id, amount_eur, method, status)
     VALUES ($1, $2, $3, 'BANK', 'REQUESTED')`,
    [t, user.id, balance]
  );
  redirect("/app/wallet?ok=payout");
}
