"use server";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import { query, queryOne } from "@/db/client";
import { audit } from "@/lib/audit";
import { appendCustody } from "@/lib/shipments";

// ---------- Lockers / compartimenten ----------
export async function assignCompartmentAction(formData: FormData) {
  const user = await requireCapability("ops.intake");
  const tenantId = user.tenantId;
  const compartmentId = String(formData.get("compartment_id") ?? "");
  const shipmentId = String(formData.get("shipment_id") ?? "") || null;
  if (!compartmentId || !shipmentId) redirect("/app/lockers?error=fields");

  const comp = await queryOne<{ status: string; label: string }>(
    `SELECT status, label FROM locker_compartments WHERE id=$1 AND tenant_id=$2`, [compartmentId, tenantId]);
  if (!comp || comp.status !== "FREE") redirect("/app/lockers?error=occupied");

  const pin = String(Math.floor(1000 + Math.random() * 9000));
  await query(
    `UPDATE locker_compartments SET status='OCCUPIED', shipment_id=$1, pin_code=$2, updated_at=now() WHERE id=$3`,
    [shipmentId, pin, compartmentId]);
  await appendCustody({ tenantId, shipmentId, eventType: "LOCKER_DEPOSIT", actorId: user.id, notes: `Locker ${comp.label} · pin ${pin}` });
  await audit({ tenantId, userId: user.id, action: "LOCKER_ASSIGN", entityType: "locker_compartment", entityId: compartmentId, summary: comp.label });
  redirect("/app/lockers?ok=assigned");
}

export async function releaseCompartmentAction(formData: FormData) {
  const user = await requireCapability("ops.intake");
  const tenantId = user.tenantId;
  const compartmentId = String(formData.get("compartment_id") ?? "");
  const comp = await queryOne<{ shipment_id: string | null; label: string }>(
    `SELECT shipment_id, label FROM locker_compartments WHERE id=$1 AND tenant_id=$2`, [compartmentId, tenantId]);
  await query(
    `UPDATE locker_compartments SET status='FREE', shipment_id=NULL, pin_code=NULL, updated_at=now() WHERE id=$1 AND tenant_id=$2`,
    [compartmentId, tenantId]);
  if (comp?.shipment_id) {
    await appendCustody({ tenantId, shipmentId: comp.shipment_id, eventType: "LOCKER_PICKUP", actorId: user.id, notes: `Locker ${comp.label} opgehaald` });
  }
  await audit({ tenantId, userId: user.id, action: "LOCKER_RELEASE", entityType: "locker_compartment", entityId: compartmentId });
  redirect("/app/lockers?ok=released");
}

// ---------- Tijdslots ----------
export async function addTimeslotAction(formData: FormData) {
  const user = await requireCapability("ops.intake");
  const tenantId = user.tenantId;
  const hubId = String(formData.get("hub_id") ?? "") || null;
  const slotType = String(formData.get("slot_type") ?? "DROPOFF");
  const day = String(formData.get("day") ?? "");        // YYYY-MM-DD
  const hour = parseInt(String(formData.get("hour") ?? "9"), 10) || 9;
  const capacity = parseInt(String(formData.get("capacity") ?? "5"), 10) || 5;
  if (!day) redirect("/app/lockers?error=fields");

  await query(
    `INSERT INTO timeslots (tenant_id, hub_id, slot_type, starts_at, ends_at, capacity, booked)
     VALUES ($1,$2,$3, ($4::date + make_interval(hours => $5::int)), ($4::date + make_interval(hours => $6::int)), $7::int, 0)`,
    [tenantId, hubId, slotType, day, hour, hour + 2, capacity]);
  await audit({ tenantId, userId: user.id, action: "TIMESLOT_ADD", entityType: "timeslot", summary: `${slotType} ${day} ${hour}u` });
  redirect("/app/lockers?ok=slot");
}

export async function bookSlotAction(formData: FormData) {
  const user = await requireCapability("ops.intake");
  const tenantId = user.tenantId;
  const timeslotId = String(formData.get("timeslot_id") ?? "");
  const shipmentId = String(formData.get("shipment_id") ?? "") || null;
  const slot = await queryOne<{ capacity: number; booked: number; slot_type: string }>(
    `SELECT capacity, booked, slot_type FROM timeslots WHERE id=$1 AND tenant_id=$2`, [timeslotId, tenantId]);
  if (!slot) redirect("/app/lockers?error=fields");
  if (slot.booked >= slot.capacity) redirect("/app/lockers?error=full");

  await query(
    `INSERT INTO slot_bookings (tenant_id, timeslot_id, shipment_id, user_id, purpose, status)
     VALUES ($1,$2,$3,$4,$5,'BOOKED')`,
    [tenantId, timeslotId, shipmentId, user.id, slot.slot_type]);
  await query(`UPDATE timeslots SET booked = booked + 1 WHERE id=$1`, [timeslotId]);
  await audit({ tenantId, userId: user.id, action: "SLOT_BOOK", entityType: "timeslot", entityId: timeslotId });
  redirect("/app/lockers?ok=booked");
}

// ---------- Reconciliatie ----------
async function expectedRefs(tenantId: string): Promise<Set<string>> {
  // "Wat hoort fysiek in de hub te liggen": zendingen in een hub-status óf
  // zendingen die in een bezet lockercompartiment liggen.
  const rows = await query<{ reference: string }>(
    `SELECT DISTINCT s.reference
       FROM shipments s
      WHERE s.tenant_id=$1
        AND ( s.status IN ('INTAKE','SEALED','IN_CUSTODY')
              OR s.id IN (SELECT shipment_id FROM locker_compartments
                           WHERE tenant_id=$1 AND status='OCCUPIED' AND shipment_id IS NOT NULL) )`,
    [tenantId]);
  return new Set(rows.map((r) => r.reference));
}

export async function createReconAction(formData: FormData) {
  const user = await requireCapability("ops.intake");
  const tenantId = user.tenantId;
  const hubId = String(formData.get("hub_id") ?? "") || null;
  const expected = (await expectedRefs(tenantId)).size;
  const seq = await queryOne<{ n: number }>(`SELECT count(*)::int + 1 AS n FROM reconciliations WHERE tenant_id=$1`, [tenantId]);
  const ref = `RC-${new Date().getUTCFullYear()}-${String(seq?.n ?? 1).padStart(4, "0")}`;
  const row = await queryOne<{ id: string }>(
    `INSERT INTO reconciliations (tenant_id, hub_id, reference, status, expected_count, scanned_count)
     VALUES ($1,$2,$3,'OPEN',$4,0) RETURNING id`, [tenantId, hubId, ref, expected]);
  await audit({ tenantId, userId: user.id, action: "RECON_CREATE", entityType: "reconciliation", entityId: row?.id, summary: ref });
  redirect("/app/lockers?ok=recon");
}

export async function addReconScanAction(formData: FormData) {
  const user = await requireCapability("ops.intake");
  const tenantId = user.tenantId;
  const reconId = String(formData.get("reconciliation_id") ?? "");
  const raw = String(formData.get("shipment_ref") ?? "").trim().toUpperCase();
  if (!reconId || !raw) redirect("/app/lockers?error=fields");

  const expected = await expectedRefs(tenantId);
  // Meerdere refs tegelijk (komma/spatie/nieuwe regel gescheiden) toestaan.
  const refs = raw.split(/[\s,;]+/).filter(Boolean);
  for (const ref of refs) {
    const already = await queryOne<{ id: string }>(
      `SELECT id FROM reconciliation_scans WHERE reconciliation_id=$1 AND shipment_ref=$2`, [reconId, ref]);
    if (already) continue;
    const result = expected.has(ref) ? "MATCH" : "UNEXPECTED";
    await query(`INSERT INTO reconciliation_scans (reconciliation_id, shipment_ref, result) VALUES ($1,$2,$3)`, [reconId, ref, result]);
  }
  // Tellingen + status herberekenen.
  const scanned = await query<{ result: string }>(`SELECT result FROM reconciliation_scans WHERE reconciliation_id=$1`, [reconId]);
  const matched = scanned.filter((s) => s.result === "MATCH").length;
  const unexpected = scanned.filter((s) => s.result === "UNEXPECTED").length;
  const rec = await queryOne<{ expected_count: number }>(`SELECT expected_count FROM reconciliations WHERE id=$1`, [reconId]);
  const status = unexpected > 0 || matched < (rec?.expected_count ?? 0) ? "DISCREPANCY" : "BALANCED";
  await query(`UPDATE reconciliations SET scanned_count=$1, status=$2 WHERE id=$3`, [matched, status, reconId]);
  await audit({ tenantId, userId: user.id, action: "RECON_SCAN", entityType: "reconciliation", entityId: reconId, summary: `${refs.length} scan(s)` });
  redirect("/app/lockers?ok=scan");
}

export async function closeReconAction(formData: FormData) {
  const user = await requireCapability("ops.intake");
  const tenantId = user.tenantId;
  const reconId = String(formData.get("reconciliation_id") ?? "");
  // Verwachte refs die niet gescand zijn → MISSING vastleggen.
  const expected = await expectedRefs(tenantId);
  const scanned = await query<{ shipment_ref: string }>(`SELECT shipment_ref FROM reconciliation_scans WHERE reconciliation_id=$1`, [reconId]);
  const scannedSet = new Set(scanned.map((s) => s.shipment_ref));
  for (const ref of expected) {
    if (!scannedSet.has(ref)) {
      await query(`INSERT INTO reconciliation_scans (reconciliation_id, shipment_ref, result) VALUES ($1,$2,'MISSING')`, [reconId, ref]);
    }
  }
  await query(`UPDATE reconciliations SET status='CLOSED', closed_at=now() WHERE id=$1 AND tenant_id=$2`, [reconId, tenantId]);
  await audit({ tenantId, userId: user.id, action: "RECON_CLOSE", entityType: "reconciliation", entityId: reconId });
  redirect("/app/lockers?ok=reconclosed");
}
