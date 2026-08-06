"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Achtergrondvideo voor de hero. Autoplay + muted + loop + playsInline zodat het op
 * alle toestellen speelt. Respecteert 'prefers-reduced-motion' (dan geen video).
 * De luchthaven-illustratie eronder blijft de fallback tot de video draait of als hij faalt.
 */
export function HeroVideo({ src, poster }: { src: string; poster?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const v = ref.current;
    if (!v) return;
    const onPlaying = () => setShow(true);
    v.addEventListener("playing", onPlaying);
    v.play().catch(() => {/* autoplay geblokkeerd → fallback blijft */});
    return () => v.removeEventListener("playing", onPlaying);
  }, []);

  return (
    <video
      ref={ref}
      // Inline stijl garandeert full-bleed cover, onafhankelijk van CSS-compilatie.
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        objectFit: "cover", objectPosition: "center",
        opacity: show ? 1 : 0, transition: "opacity .7s ease",
      }}
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
    />
  );
}
