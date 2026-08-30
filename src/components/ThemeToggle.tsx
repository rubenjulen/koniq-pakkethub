"use client";
import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

const ICON: Record<Theme, string> = { light: "☀️", dark: "🌙", system: "💻" };
const NEXT: Record<Theme, Theme> = { light: "dark", dark: "system", system: "light" };
const LABEL: Record<Theme, string> = { light: "Licht", dark: "Donker", system: "Auto" };

/** Compacte thema-schakelaar: één knop die licht → donker → auto doorloopt. Onthoudt de keuze in een cookie. */
export function ThemeToggle({ light = false }: { light?: boolean }) {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const m = document.cookie.match(/(?:^|; )theme=([^;]+)/);
    const t = (m ? decodeURIComponent(m[1]) : "system") as Theme;
    setTheme(t);
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => { if ((document.cookie.match(/(?:^|; )theme=([^;]+)/)?.[1] ?? "system") === "system") apply("system"); };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function cycle() {
    const t = NEXT[theme];
    document.cookie = `theme=${t};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    setTheme(t);
    apply(t);
  }

  return (
    <button
      onClick={cycle}
      title={`${LABEL[theme]} — klik voor ${LABEL[NEXT[theme]]}`}
      aria-label={`Thema: ${LABEL[theme]}`}
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm transition ${
        light ? "text-white hover:bg-white/10" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {ICON[theme]}
    </button>
  );
}
