import Link from "next/link";
import { requireCapability } from "@/lib/auth";
import { getCorridors, getCategoriesList } from "@/lib/tenant";
import { NewShipmentForm } from "@/components/NewShipmentForm";
import { createShipmentAction } from "../actions";

export const metadata = { title: "Pakket versturen" };

export default async function NewShipmentPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireCapability("shipment.create");
  const { error } = await searchParams;
  const corridors = await getCorridors(user.tenantId);
  const categories = await getCategoriesList(user.tenantId);

  const cats = categories.map((c) => ({
    code: c.code, name: c.name, description: c.description,
    traveler_eligible: c.traveler_eligible, requires_review: c.requires_review,
    prohibited: c.prohibited, dangerous_goods: c.dangerous_goods,
    max_value_eur: c.max_value_eur != null ? parseFloat(String(c.max_value_eur)) : null,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <Link href="/app/shipments" className="text-sm text-orange-600 hover:underline">← Zendingen</Link>
        <h1 className="mt-1 text-xl font-bold text-slate-900">Pakket versturen</h1>
        <p className="text-sm text-slate-500">
          Geef de inhoud volledig aan. We controleren meteen of het via een reiziger mag of naar freight moet.
        </p>
      </div>
      {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>}
      <NewShipmentForm corridors={corridors} categories={cats} action={createShipmentAction} />
    </div>
  );
}
