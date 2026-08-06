import Link from "next/link";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import type { Messages } from "@/i18n/messages/nl";
import type { Locale } from "@/i18n/config";

export function SiteHeader({ m, locale }: { m: Messages; locale: Locale }) {
  const NAV: [string, string][] = [
    ["/hoe-het-werkt", m.nav.how_it_works],
    ["/verzenden", m.nav.send],
    ["/prijzen", m.nav.pricing],
    ["/trust", m.nav.trust],
    ["/track", m.nav.track],
  ];
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/"><Logo /></Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="hover:text-orange-600">{label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <LanguageSwitcher current={locale} />
          <Link href="/login" className="ph-btn ph-btn-ghost text-sm">{m.common.login}</Link>
          <Link href="/verzenden" className="ph-btn ph-btn-primary text-sm">{m.common.send_package}</Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ m }: { m: Messages }) {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-slate-900 text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo light />
          <p className="mt-3 text-sm text-slate-400">{m.footer.tagline}</p>
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold text-white">{m.footer.services}</h4>
          <ul className="space-y-1 text-sm">
            <li><Link href="/verzenden" className="hover:text-white">{m.footer.svc_send}</Link></li>
            <li><Link href="/hoe-het-werkt" className="hover:text-white">{m.footer.svc_travel}</Link></li>
            <li><Link href="/prijzen" className="hover:text-white">{m.footer.svc_pricing}</Link></li>
            <li><Link href="/partner" className="hover:text-white">{m.footer.svc_partner}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold text-white">{m.footer.trust_h}</h4>
          <ul className="space-y-1 text-sm">
            <li><Link href="/trust" className="hover:text-white">{m.footer.trust_center}</Link></li>
            <li><Link href="/trust#goederenbeleid" className="hover:text-white">{m.footer.goods_policy}</Link></li>
            <li><Link href="/trust#betalingen" className="hover:text-white">{m.footer.payments}</Link></li>
            <li><Link href="/trust#privacy" className="hover:text-white">{m.footer.privacy}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold text-white">{m.footer.entity}</h4>
          <p className="text-sm text-slate-400">{m.footer.entity_body}</p>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-slate-500">
        {m.footer.legal.replace("{year}", String(new Date().getFullYear()))}
      </div>
    </footer>
  );
}

export function StagedBanner({ m }: { m: Messages }) {
  return (
    <div className="bg-amber-400 px-4 py-1.5 text-center text-xs font-medium text-amber-950">
      {m.banner.staging}
    </div>
  );
}
