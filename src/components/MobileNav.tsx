"use client";
import { useState } from "react";
import Link from "next/link";
import { InstallAppButton } from "./InstallAppButton";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import type { Locale } from "@/i18n/config";

/** Hamburgermenu voor smalle schermen: taal, thema, nav-links, login, verstuur, installeren. */
export function MobileNav({
  nav, login, send, installLabel, locale,
}: {
  nav: [string, string][];
  login: string;
  send: string;
  installLabel: string;
  locale: Locale;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-lg text-slate-700 hover:bg-slate-50"
      >
        {open ? "✕" : "☰"}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30 bg-black/20" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 top-full z-40 border-b border-slate-200 bg-white shadow-xl">
            <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
              <div className="mb-1 flex items-center justify-between">
                <LanguageSwitcher current={locale} />
                <ThemeToggle />
              </div>
              {nav.map(([href, label]) => (
                <Link key={href} href={href} onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  {label}
                </Link>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link href="/login" onClick={() => setOpen(false)} className="ph-btn ph-btn-ghost text-sm">{login}</Link>
                <Link href="/verzenden" onClick={() => setOpen(false)} className="ph-btn ph-btn-primary text-sm">{send}</Link>
              </div>
              <div className="mt-2"><InstallAppButton label={installLabel} /></div>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
