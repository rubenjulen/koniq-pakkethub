"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_META, type Locale } from "@/i18n/config";

/** Taalwisselaar: zet de 'locale'-cookie en ververst de pagina (server-rendered vertaling). */
export function LanguageSwitcher({ current, light = false }: { current: Locale; light?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function choose(l: Locale) {
    document.cookie = `locale=${l};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    setOpen(false);
    router.refresh();
  }

  const meta = LOCALE_META[current];
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium ${light ? "text-white hover:bg-white/10" : "text-slate-600 hover:bg-slate-100"}`}
        aria-label="Language"
      >
        <span>{meta.flag}</span>
        <span className="hidden sm:inline">{meta.native}</span>
        <span aria-hidden className="text-xs opacity-60">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {LOCALES.map((l) => (
            <button
              key={l}
              onClick={() => choose(l)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${l === current ? "font-semibold text-orange-600" : "text-slate-700"}`}
            >
              <span>{LOCALE_META[l].flag}</span>
              <span>{LOCALE_META[l].native}</span>
              {l === current && <span className="ml-auto text-orange-500">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
