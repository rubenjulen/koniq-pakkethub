"use client";
import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

/** Thema-schakelaar: licht / donker / automatisch (systeem). Onthoudt de keuze in een cookie. */
export function ThemeToggle({ light = false }: { light?: boolean }) {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const m = document.cookie.match(/(?:^|; )theme=([^;]+)/);
    const t = (m ? decodeURIComponent(m[1]) : "system") as Theme;
    setTheme(t);
    // Volg systeemwijzigingen wanneer 'system' actief is.
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => { if ((document.cookie.match(/(?:^|; )theme=([^;]+)/)?.[1] ?? "system") === "system") apply("system"); };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function choose(t: Theme) {
    document.cookie = `theme=${t};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    setTheme(t);
    apply(t);
  }

  const options: [Theme, string, string][] = [
    ["light", "☀️", "Licht"],
    ["dark", "🌙", "Donker"],
    ["system", "💻", "Auto"],
  ];
  const base = light ? "text-white/80" : "text-slate-500";

  return (
    <div className={`inline-flex items-center gap-0.5 rounded-full border p-0.5 ${light ? "border-white/20" : "border-slate-200"}`}>
      {options.map(([t, icon, label]) => (
        <button
          key={t}
          onClick={() => choose(t)}
          title={label}
          aria-label={label}
          aria-pressed={theme === t}
          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs transition ${
            theme === t ? "bg-orange-500 text-white" : `${base} hover:opacity-100`
          }`}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
