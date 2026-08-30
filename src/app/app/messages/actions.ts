"use server";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { startDirectConversation } from "@/lib/chat";

/** Start (of hervat) een direct gesprek met een ander lid — vanaf route-/verzoek-kaarten of profiel. */
export async function startChatAction(formData: FormData) {
  const user = await requireSession();
  const otherId = String(formData.get("other_id") ?? "");
  const tripId = String(formData.get("trip_id") ?? "") || null;
  if (!otherId || otherId === user.id) redirect("/app/messages");
  const convId = await startDirectConversation({ tenantId: user.tenantId, meId: user.id, otherId, tripId });
  redirect(`/app/messages/${convId}`);
}
