"use server";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import { query } from "@/db/client";
import { audit } from "@/lib/audit";
import { appendCustody } from "@/lib/shipments";

export async function createDispatchJobAction(formData: FormData) {
  const user = await requireCapability("ops.intake");
  const tenantId = user.tenantId;
  const shipmentId = String(formData.get("shipment_id") ?? "") || null;
  const jobType = String(formData.get("job_type") ?? "LAST_MILE");
  await query(`INSERT INTO dispatch_jobs (tenant_id, shipment_id, job_type, status) VALUES ($1,$2,$3,'UNASSIGNED')`,
    [tenantId, shipmentId, jobType]);
  await audit({ tenantId, userId: user.id, action: "DISPATCH_CREATE", entityType: "dispatch_job" });
  redirect("/app/dispatch");
}

export async function assignDispatchAction(formData: FormData) {
  const user = await requireCapability("ops.intake");
  const tenantId = user.tenantId;
  const jobId = String(formData.get("job_id") ?? "");
  const vehicleId = String(formData.get("vehicle_id") ?? "") || null;
  const driverId = String(formData.get("driver_id") ?? "") || null;
  const fleetId = String(formData.get("fleet_id") ?? "") || null;
  await query(`UPDATE dispatch_jobs SET fleet_id=$1, vehicle_id=$2, driver_id=$3, status='ASSIGNED' WHERE id=$4 AND tenant_id=$5`,
    [fleetId, vehicleId, driverId, jobId, tenantId]);
  await audit({ tenantId, userId: user.id, action: "DISPATCH_ASSIGN", entityType: "dispatch_job", entityId: jobId });
  redirect("/app/dispatch");
}

export async function addFleetAction(formData: FormData) {
  const user = await requireCapability("ops.intake");
  const tenantId = user.tenantId;
  const name = String(formData.get("name") ?? "").trim();
  const area = String(formData.get("service_area") ?? "").trim() || null;
  if (!name) redirect("/app/dispatch");
  await query(`INSERT INTO fleets (tenant_id, name, kyb_status, service_area, status) VALUES ($1,$2,'PENDING',$3,'ACTIVE')`,
    [tenantId, name, area]);
  await audit({ tenantId, userId: user.id, action: "FLEET_ADD", entityType: "fleet", summary: name });
  redirect("/app/dispatch");
}

export async function addVehicleAction(formData: FormData) {
  const user = await requireCapability("ops.intake");
  const tenantId = user.tenantId;
  const fleetId = String(formData.get("fleet_id") ?? "");
  const plate = String(formData.get("plate") ?? "").trim();
  const type = String(formData.get("vehicle_type") ?? "VAN");
  const cap = parseFloat(String(formData.get("capacity_kg") ?? "500")) || 500;
  if (!fleetId || !plate) redirect("/app/dispatch");
  await query(`INSERT INTO vehicles (tenant_id, fleet_id, plate, vehicle_type, capacity_kg, status) VALUES ($1,$2,$3,$4,$5,'AVAILABLE')`,
    [tenantId, fleetId, plate, type, cap]);
  await audit({ tenantId, userId: user.id, action: "VEHICLE_ADD", entityType: "vehicle", summary: plate });
  redirect("/app/dispatch");
}

export async function addDriverAction(formData: FormData) {
  const user = await requireCapability("ops.intake");
  const tenantId = user.tenantId;
  const fleetId = String(formData.get("fleet_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const license = String(formData.get("license_ref") ?? "").trim() || null;
  if (!fleetId || !name) redirect("/app/dispatch");
  await query(`INSERT INTO drivers (tenant_id, fleet_id, name, phone, license_ref, status) VALUES ($1,$2,$3,$4,$5,'ACTIVE')`,
    [tenantId, fleetId, name, phone, license]);
  await audit({ tenantId, userId: user.id, action: "DRIVER_ADD", entityType: "driver", summary: name });
  redirect("/app/dispatch");
}

export async function approveKybAction(formData: FormData) {
  const user = await requireCapability("control.view");
  const tenantId = user.tenantId;
  const fleetId = String(formData.get("fleet_id") ?? "");
  const approve = String(formData.get("outcome") ?? "") === "approve";
  await query(`UPDATE fleets SET kyb_status=$1 WHERE id=$2 AND tenant_id=$3`, [approve ? "VERIFIED" : "REJECTED", fleetId, tenantId]);
  await audit({ tenantId, userId: user.id, action: "FLEET_KYB", entityType: "fleet", entityId: fleetId, summary: approve ? "VERIFIED" : "REJECTED" });
  redirect("/app/dispatch");
}

export async function advanceDispatchAction(formData: FormData) {
  const user = await requireCapability("ops.intake");
  const tenantId = user.tenantId;
  const jobId = String(formData.get("job_id") ?? "");
  const to = String(formData.get("to_status") ?? "");
  const shipmentId = String(formData.get("shipment_id") ?? "") || null;
  await query(`UPDATE dispatch_jobs SET status=$1 WHERE id=$2 AND tenant_id=$3`, [to, jobId, tenantId]);
  if (to === "DONE" && shipmentId) {
    await appendCustody({ tenantId, shipmentId, eventType: "DELIVERED", actorId: user.id, notes: "Last-mile levering voltooid door fleet." });
  }
  await audit({ tenantId, userId: user.id, action: "DISPATCH_ADVANCE", entityType: "dispatch_job", entityId: jobId, summary: to });
  redirect("/app/dispatch");
}
