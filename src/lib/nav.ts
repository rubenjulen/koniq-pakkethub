import type { SessionUser } from "./auth";
import { hasCapability } from "./auth";
import type { Messages } from "@/i18n/messages/nl";

type NavKey = keyof Messages["appnav"];
export type NavItem = { href: string; key: NavKey; icon: string; cap?: string };

const ALL: NavItem[] = [
  { href: "/app", key: "overview", icon: "🏠" },
  { href: "/app/shipments", key: "shipments", icon: "📦", cap: "shipment.create" },
  { href: "/app/marketplace", key: "marketplace", icon: "🧳" },
  { href: "/app/trips", key: "trips", icon: "✈️", cap: "trip.create" },
  { href: "/app/messages", key: "messages", icon: "💬", cap: "chat.use" },
  { href: "/app/wallet", key: "wallet", icon: "💶" },
  { href: "/app/claims", key: "claims", icon: "🛟" },
  { href: "/app/shop", key: "shop", icon: "🛒" },
  { href: "/app/books", key: "books", icon: "📇", cap: "shipment.create" },
  { href: "/app/bulk", key: "bulk", icon: "📤", cap: "shipment.create" },
  { href: "/app/ops", key: "ops", icon: "🏭", cap: "ops.intake" },
  { href: "/app/freight", key: "freight", icon: "🚢", cap: "ops.intake" },
  { href: "/app/dispatch", key: "dispatch", icon: "🚚", cap: "ops.intake" },
  { href: "/app/manifests", key: "manifests", icon: "🧾", cap: "ops.intake" },
  { href: "/app/lockers", key: "lockers", icon: "🔐", cap: "ops.intake" },
  { href: "/app/business", key: "business", icon: "🏢", cap: "control.view" },
  { href: "/app/analytics", key: "analytics", icon: "📊", cap: "control.view" },
  { href: "/app/insights", key: "insights", icon: "📈", cap: "control.view" },
  { href: "/app/control", key: "control", icon: "🛡️", cap: "control.view" },
  { href: "/app/console", key: "console", icon: "🧪", cap: "control.view" },
  { href: "/app/content", key: "content", icon: "🎬", cap: "control.view" },
  { href: "/app/members", key: "members", icon: "👥", cap: "admin.all" },
  { href: "/app/ads", key: "ads", icon: "📣", cap: "control.view" },
  { href: "/app/help", key: "help", icon: "📖" },
];

export function navFor(user: SessionUser): NavItem[] {
  return ALL.filter((item) => !item.cap || hasCapability(user, item.cap));
}
