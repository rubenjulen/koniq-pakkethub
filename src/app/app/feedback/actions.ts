"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { query } from "@/db/client";
import { audit } from "@/lib/audit";

const CATS = ["BUG", "IDEA", "QUESTION", "OTHER"];

/** Testfeedback opslaan (in-app), gekoppeld aan gebruiker + pagina. */
export async function submitFeedbackAction(formData: FormData) {
  const user = await requireSession();
  const raw = String(formData.get("page") ?? "");
  const page = (raw.startsWith("/") ? raw.split("?")[0] : "").slice(0, 300) || null;
  const category = CATS.includes(String(formData.get("category"))) ? String(formData.get("category")) : "OTHER";
  const message = String(formData.get("message") ?? "").trim().slice(0, 4000);
  const back = page ?? "/app";
  if (!message) redirect(`${back}?fb=empty`);

  await query(
    `INSERT INTO feedback (tenant_id, user_id, page, category, message) VALUES ($1,$2,$3,$4,$5)`,
    [user.tenantId, user.id, page, category, message]
  );
  await audit({ tenantId: user.tenantId, userId: user.id, action: "FEEDBACK_SUBMIT", entityType: "feedback", summary: category });
  redirect(`${back}?fb=sent`);
}
