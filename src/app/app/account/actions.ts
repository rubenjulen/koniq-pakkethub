"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { startVerification } from "@/lib/adapters/kyc";
import { audit } from "@/lib/audit";

/** Start (simulatie) identiteitsverificatie voor de ingelogde gebruiker. */
export async function startKycAction() {
  const user = await requireSession();
  await startVerification({ tenantId: user.tenantId, userId: user.id, method: "ID_SCAN" });
  await audit({ tenantId: user.tenantId, userId: user.id, action: "KYC_START", entityType: "user", entityId: user.id });
  revalidatePath("/app/account");
  redirect("/app/account?started=1");
}
