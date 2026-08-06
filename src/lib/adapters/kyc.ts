import "server-only";
import { query, queryOne } from "@/db/client";
import { PROVIDERS } from "./config";

/**
 * KYC/identiteit-adapter. SIMULATED = 'PakketHub Verify (sandbox)': start een verificatie
 * die op PENDING staat tot een beoordelaar/tester een besluit neemt (Test Console of
 * ops-review). Echte livegang koppelt een IDV-provider (bijv. Onfido/Veriff/iDIN) achter
 * dezelfde start/decide-interface.
 */
export async function startVerification(opts: {
  tenantId: string;
  userId: string;
  method?: string;
}): Promise<{ id: string; status: string }> {
  await query(`UPDATE users SET kyc_status='PENDING' WHERE id=$1`, [opts.userId]);
  const row = await queryOne<{ id: string }>(
    `INSERT INTO kyc_verifications (tenant_id, user_id, method, level, status, document_ref)
     VALUES ($1,$2,$3,'FULL','PENDING',$4) RETURNING id`,
    [opts.tenantId, opts.userId, opts.method ?? PROVIDERS.kyc.name, `sim-${Date.now().toString(36)}`]
  );
  return { id: row!.id, status: "PENDING" };
}

export async function decideVerification(opts: {
  verificationId: string;
  approve: boolean;
  reviewerId?: string | null;
  notes?: string;
}) {
  const v = await queryOne<{ user_id: string; tenant_id: string }>(
    `SELECT user_id, tenant_id FROM kyc_verifications WHERE id=$1`, [opts.verificationId]
  );
  if (!v) return;
  const status = opts.approve ? "VERIFIED" : "REJECTED";
  await query(
    `UPDATE kyc_verifications SET status=$1, reviewed_by=$2, reviewed_at=now(), notes=$3 WHERE id=$4`,
    [status, opts.reviewerId ?? null, opts.notes ?? null, opts.verificationId]
  );
  await query(`UPDATE users SET kyc_status=$1, kyc_level=$2 WHERE id=$3`,
    [status, opts.approve ? "FULL" : "NONE", v.user_id]);
  return v;
}
