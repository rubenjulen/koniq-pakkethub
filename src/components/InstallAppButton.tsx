"use client";
import { useEffect, useState } from "react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * "Installeer de app"-knop. Vangt het beforeinstallprompt-event (Chrome/Edge/Android)
 * en toont anders een iOS-instructie. Zo is PakketHub op elk toestel te "downloaden".
 */
export function InstallAppButton({ className = "", label = "Installeer de app" }: { className?: string; label?: string }) {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    // Al geïnstalleerd?
    if (window.matchMedia?.("(display-mode: standalone)").matches) setInstalled(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <span className={`ph-chip bg-orange-50 text-orange-700 ${className}`}>✓ App geïnstalleerd</span>
    );
  }

  async function handleClick() {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    } else {
      // iOS Safari heeft geen prompt-API → toon instructie.
      setShowIos((v) => !v);
    }
  }

  return (
    <div className={className}>
      <button onClick={handleClick} className="ph-btn ph-btn-primary">
        <span aria-hidden>⬇</span> {label}
      </button>
      {showIos && (
        <p className="mt-2 max-w-xs text-xs text-slate-600">
          Op iPhone/iPad: tik op <strong>Deel</strong> ⎙ en kies{" "}
          <strong>&ldquo;Zet op beginscherm&rdquo;</strong>. De app opent daarna fullscreen, net als een gedownloade app.
        </p>
      )}
    </div>
  );
}
