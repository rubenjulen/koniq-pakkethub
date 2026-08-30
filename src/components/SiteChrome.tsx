import Link from "next/link";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { InstallAppButton } from "./InstallAppButton";
import { MobileNav } from "./MobileNav";
import type { Messages } from "@/i18n/messages/nl";
import type { Locale } from "@/i18n/config";

export function SiteHeader({ m, locale, discoverCount = 0 }: { m: Messages; locale: Locale; discoverCount?: number }) {
  // Primaire nav: geen dubbele bestemmingen — "Verzenden" zit al in de CTA-knop rechts.
  const NAV: [string, string][] = [
    ["/ontdek", m.nav.discover],
    ["/hoe-het-werkt", m.nav.how_it_works],
    ["/prijzen", m.nav.pricing],
    ["/trust", m.nav.trust],
    ["/track", m.nav.track],
  ];
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
        <Link href="/" className="shrink-0"><Logo /></Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 lg:flex">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="inline-flex items-center gap-1.5 whitespace-nowrap hover:text-orange-600">
              {label}
              {href === "/ontdek" && discoverCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] font-semibold text-white" title={m.ontdek.title}>{discoverCount}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {/* Desktop: utility-cluster + scheiding + auth/CTA */}
          <div className="hidden items-center gap-2 lg:flex">
            <div className="flex items-center gap-0.5">
              <ThemeToggle />
              <LanguageSwitcher current={locale} />
            </div>
            <span aria-hidden className="mx-1 h-5 w-px bg-slate-200" />
            <Link href="/login" className="ph-btn ph-btn-ghost text-sm">{m.common.login}</Link>
            <Link href="/verzenden" className="ph-btn ph-btn-primary text-sm">{m.common.send_package}</Link>
          </div>
          {/* Mobiel: altijd zichtbare install-knop + hamburger */}
          <InstallAppButton compact label={m.home.install_app} className="lg:hidden" />
          <MobileNav nav={NAV} login={m.common.login} send={m.common.send_package} installLabel={m.home.install_app} locale={locale} discoverCount={discoverCount} />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ m, discoverCount = 0 }: { m: Messages; discoverCount?: number }) {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-slate-900 text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo light />
          <p className="mt-3 text-sm text-slate-400">{m.footer.tagline}</p>
          {discoverCount > 0 && (
            <Link href="/ontdek" className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/15 hover:bg-white/20">
              <span className="h-2 w-2 rounded-full bg-orange-400" />
              {discoverCount} {m.home.live_open}
            </Link>
          )}
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
