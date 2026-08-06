"use server";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { query, queryOne } from "@/db/client";
import { audit } from "@/lib/audit";
import { parseBulkCsv } from "@/lib/bulk";
import { nextReference, recomputeEligibility, appendCustody } from "@/lib/shipments";
import { getCorridors } from "@/lib/tenant";

/** Parseert de geplakte CSV en bewaart het als een bulk_upload (status PARSED). */
export async function parseBulkAction(formData: FormData) {
  const user = await requireSession();
  const text = String(formData.get("csv") ?? "");
  const rows = parseBulkCsv(text);
  const ok = rows.filter((r) => r.ok).length;
  const row = await queryOne<{ id: string }>(
    `INSERT INTO bulk_uploads (tenant_id, uploaded_by, filename, total_rows, ok_rows, error_rows, status, rows)
     VALUES ($1,$2,$3,$4,$5,$6,'PARSED',$7) RETURNING id`,
    [user.tenantId, user.id, "plakupload.csv", rows.length, ok, rows.length - ok, JSON.stringify(rows)]);
  await audit({ tenantId: user.tenantId, userId: user.id, action: "BULK_PARSE", entityType: "bulk_upload", entityId: row?.id, summary: `${ok}/${rows.length} geldig` });
  redirect(`/app/bulk?upload=${row?.id}`);
}

/** Maakt zendingen aan van de geldige regels van een bulk_upload. */
export async function commitBulkAction(formData: FormData) {
  const user = await requireSession();
  const tenantId = user.tenantId;
  const uploadId = String(formData.get("upload_id") ?? "");
  const up = await queryOne<any>(`SELECT rows, status FROM bulk_uploads WHERE id=$1 AND tenant_id=$2`, [uploadId, tenantId]);
  if (!up || up.status === "COMMITTED") redirect("/app/bulk");

  const corridors = await getCorridors(tenantId);
  const pilot = corridors.find((c: any) => c.status === "PILOT") ?? corridors[0];
  const rows: any[] = Array.isArray(up.rows) ? up.rows : JSON.parse(up.rows);

  let created = 0;
  for (const r of rows) {
    if (!r.ok) continue;
    const reference = await nextReference(tenantId);
    const s = await queryOne<{ id: string }>(
      `INSERT INTO shipments (tenant_id, reference, sender_id, corridor_id, service_mode,
          recipient_name, recipient_phone, recipient_city, recipient_country,
          declared_weight_kg, is_sealed_closed, pickup_choice, notes, status, eligibility)
       VALUES ($1,$2,$3,$4,'CROWDSHIP',$5,$6,$7,$8,$9,false,'HUB_DROPOFF','Bulk-upload','SCREENING','PENDING')
       RETURNING id`,
      [tenantId, reference, user.id, pilot.id, r.name, r.phone || null, r.city || null, r.country || "SR", r.weight]);
    const shipmentId = s!.id;
    await query(
      `INSERT INTO shipment_items (tenant_id, shipment_id, description, quantity, unit_value, currency, category_code)
       VALUES ($1,$2,$3,1,$4,'EUR','UNKNOWN')`,
      [tenantId, shipmentId, r.description || "Diverse artikelen", r.value ?? 0]);
    await appendCustody({ tenantId, shipmentId, eventType: "CREATED", actorId: user.id, notes: "Aangemaakt via bulk-upload." });
    const decision = await recomputeEligibility(tenantId, shipmentId);
    if (decision === "ALLOW") await query(`UPDATE shipments SET status='QUOTED' WHERE id=$1`, [shipmentId]);
    await query(
      `INSERT INTO bulk_upload_items (bulk_upload_id, row_no, shipment_id, status) VALUES ($1,$2,$3,'CREATED')`,
      [uploadId, r.row_no, shipmentId]);
    created++;
  }
  await query(`UPDATE bulk_uploads SET status='COMMITTED' WHERE id=$1`, [uploadId]);
  await audit({ tenantId, userId: user.id, action: "BULK_COMMIT", entityType: "bulk_upload", entityId: uploadId, summary: `${created} zending(en)` });
  redirect(`/app/bulk?upload=${uploadId}&created=${created}`);
}
