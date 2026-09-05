"use client";
import { useEffect, useState } from "react";
import { track } from "@/lib/track";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * "Installeer de app"-knop. Vangt het beforeinstallprompt-event (Chrome/Edge/Android)
 * en toont anders een iOS-instructie. Zo is BugaWuga op elk toestel te "downloaden".
 * `compact` = klein icoon-knopje voor in de header.
 */
export function InstallAppButton({ className = "", label = "Installeer de app", compact = false }: { className?: string; label?: string; compact?: boolean }) {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BIPEvent); };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia?.("(display-mode: standalone)").matches) setInstalled(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handleClick() {
    track("app_install_click");
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice.catch(() => null);
      track("app_installed", { outcome: choice?.outcome ?? "unknown" });
      setDeferred(null);
    } else {
      setShowIos((v) => !v);
    }
  }

  const iosHint = (
    <p className="max-w-xs text-xs text-slate-600">
      Op iPhone/iPad: tik op <strong>Deel</strong> ⎙ en kies{" "}
      <strong>&ldquo;Zet op beginscherm&rdquo;</strong>. De app opent daarna fullscreen, net als een gedownloade app.
    </p>
  );

  if (compact) {
    if (installed) return null;
    return (
      <div className={`relative ${className}`}>
        <button onClick={handleClick} title={label} aria-label={label}
          className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <span aria-hidden>⬇</span><span>App</span>
        </button>
        {showIos && (
          <div className="absolute right-0 top-full z-40 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
            {iosHint}
          </div>
        )}
      </div>
    );
  }

  if (installed) {
    return <span className={`ph-chip bg-orange-50 text-orange-700 ${className}`}>✓ App geïnstalleerd</span>;
  }

  return (
    <div className={className}>
      <button onClick={handleClick} className="ph-btn ph-btn-primary">
        <span aria-hidden>⬇</span> {label}
      </button>
      {showIos && <div className="mt-2">{iosHint}</div>}
    </div>
  );
}
