import type { SessionUser } from "./auth";
import { hasCapability } from "./auth";

export type NavItem = { href: string; label: string; icon: string; cap?: string };

const ALL: NavItem[] = [
  { href: "/app", label: "Overzicht", icon: "🏠" },
  { href: "/app/shipments", label: "Mijn zendingen", icon: "📦", cap: "shipment.create" },
  { href: "/app/marketplace", label: "Ritten & aanbod", icon: "🧳", cap: "offer.create" },
  { href: "/app/trips", label: "Mijn ritten", icon: "✈️", cap: "trip.create" },
  { href: "/app/messages", label: "Berichten", icon: "💬", cap: "chat.use" },
  { href: "/app/wallet", label: "Wallet & betalingen", icon: "💶" },
  { href: "/app/claims", label: "Claims & retour", icon: "🛟" },
  { href: "/app/shop", label: "Shop-verzoeken", icon: "🛒" },
  { href: "/app/ops", label: "Hub & intake", icon: "🏭", cap: "ops.intake" },
  { href: "/app/freight", label: "Warehouse & freight", icon: "🚢", cap: "ops.intake" },
  { href: "/app/dispatch", label: "Fleet & dispatch", icon: "🚚", cap: "ops.intake" },
  { href: "/app/business", label: "Business & API", icon: "🏢", cap: "control.view" },
  { href: "/app/analytics", label: "Analytics", icon: "📊", cap: "control.view" },
  { href: "/app/control", label: "Control Center", icon: "🛡️", cap: "control.view" },
  { href: "/app/console", label: "Test Console", icon: "🧪", cap: "control.view" },
];

export function navFor(user: SessionUser): NavItem[] {
  return ALL.filter((item) => !item.cap || hasCapability(user, item.cap));
}
