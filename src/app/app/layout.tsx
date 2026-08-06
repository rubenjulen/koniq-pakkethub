import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, logout } from "@/lib/auth";
import { navFor } from "@/lib/nav";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { KycBadge } from "@/components/ui";
import { initials } from "@/lib/format";
import { query } from "@/db/client";
import { getLocale, getMessages } from "@/i18n";

async function doLogout() {
  "use server";
  await logout();
  redirect("/login");
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user || !user.tenantId) redirect("/login");
  const nav = navFor(user);
  const [m, locale] = await Promise.all([getMessages(), getLocale()]);
  const A = m.appnav;

  const unreadRow = await query<{ n: number }>(
    `SELECT count(*)::int AS n
       FROM chat_messages mm
       JOIN conversation_participants p ON p.conversation_id = mm.conversation_id AND p.user_id = $1
      WHERE mm.sender_id IS DISTINCT FROM $1
        AND (p.last_read_at IS NULL OR mm.created_at > p.last_read_at)`,
    [user.id]
  );
  const unread = unreadRow[0]?.n ?? 0;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <Logo />
          <LanguageSwitcher current={locale} />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map((item) => (
            <Link key={item.href} href={item.href}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <span className="flex items-center gap-2"><span>{item.icon}</span>{A[item.key]}</span>
              {item.href === "/app/messages" && unread > 0 && (
                <span className="ph-chip bg-orange-500 text-white">{unread}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-2 rounded-lg p-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-white">
              {initials(user.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-800">{user.name}</div>
              <div className="truncate text-xs text-slate-500">{user.roleName}</div>
            </div>
          </div>
          <div className="mt-1 px-2"><KycBadge status={user.kycStatus} /></div>
          <div className="mt-2 flex gap-1">
            <Link href="/app/account" className="flex-1 rounded-lg px-2 py-1.5 text-center text-xs text-slate-500 hover:bg-slate-50">{A.account}</Link>
            <Link href="/app/notifications" className="flex-1 rounded-lg px-2 py-1.5 text-center text-xs text-slate-500 hover:bg-slate-50">{A.notifications}</Link>
          </div>
          <form action={doLogout} className="mt-1">
            <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50">{m.common.logout}</button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <Logo size={28} />
          <div className="flex items-center gap-1">
            <LanguageSwitcher current={locale} />
            <form action={doLogout}><button className="text-sm text-slate-500">{m.common.logout}</button></form>
          </div>
        </header>

        <main className="flex-1 p-4 pb-24 lg:p-8">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-slate-200 bg-white py-1 lg:hidden">
          {nav.slice(0, 5).map((item) => (
            <Link key={item.href} href={item.href}
              className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium text-slate-600">
              <span className="relative text-lg">
                {item.icon}
                {item.href === "/app/messages" && unread > 0 && (
                  <span className="absolute -right-2 -top-1 h-4 min-w-4 rounded-full bg-orange-500 px-1 text-[9px] leading-4 text-white">{unread}</span>
                )}
              </span>
              {A[item.key].split(" ")[0]}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
