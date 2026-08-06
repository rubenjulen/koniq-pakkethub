"use client";
import { useEffect } from "react";

/** Registreert de service worker zodat PakketHub installeerbaar is als app. */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // In dev laadt Next de SW ook; registratie is idempotent.
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* stil falen — app werkt ook zonder SW */
      });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
