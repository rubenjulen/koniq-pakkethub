import Link from "next/link";
import { Logo } from "./Logo";

const NAV = [
  ["/hoe-het-werkt", "Hoe het werkt"],
  ["/verzenden", "Verzenden"],
  ["/prijzen", "Prijzen"],
  ["/trust", "Trust Center"],
  ["/track", "Track & trace"],
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/"><Logo /></Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="hover:text-orange-600">{label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="ph-btn ph-btn-ghost text-sm">Inloggen</Link>
          <Link href="/verzenden" className="ph-btn ph-btn-primary text-sm">Pakket versturen</Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-slate-900 text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo light />
          <p className="mt-3 text-sm text-slate-400">
            Eén gecontroleerde corridor voor mensen, pakketten, reizigers, hubs en logistieke partners.
          </p>
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold text-white">Diensten</h4>
          <ul className="space-y-1 text-sm">
            <li><Link href="/verzenden" className="hover:text-white">Pakket versturen</Link></li>
            <li><Link href="/hoe-het-werkt" className="hover:text-white">Reizen & verdienen</Link></li>
            <li><Link href="/prijzen" className="hover:text-white">Prijzen</Link></li>
            <li><Link href="/partner" className="hover:text-white">Partner worden</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold text-white">Vertrouwen</h4>
          <ul className="space-y-1 text-sm">
            <li><Link href="/trust" className="hover:text-white">Trust Center</Link></li>
            <li><Link href="/trust#goederenbeleid" className="hover:text-white">Goederenbeleid</Link></li>
            <li><Link href="/trust#betalingen" className="hover:text-white">Betalingen</Link></li>
            <li><Link href="/trust#privacy" className="hover:text-white">Privacy</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold text-white">Entiteit</h4>
          <p className="text-sm text-slate-400">
            PakketHub (handelsnaam)<br />
            Pilot: Nederland → Suriname<br />
            <span className="text-slate-500">Juridische entiteit & registraties worden vóór livegang gepubliceerd.</span>
          </p>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} PakketHub · pakkethub.com (domein nog niet geactiveerd) ·
        Claims over snelheid, veiligheid en dekking worden pas gepubliceerd na meting en verificatie.
      </div>
    </footer>
  );
}

export function StagedBanner() {
  return (
    <div className="bg-amber-400 px-4 py-1.5 text-center text-xs font-medium text-amber-950">
      🚧 Preview — pakkethub.com wordt op een later moment geactiveerd. Dit is de werkende voorvertoning van website + app.
    </div>
  );
}
