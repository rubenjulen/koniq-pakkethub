"use client";

/** Verstuur een event naar de server (fire-and-forget). Faalt stil. */
export function track(name: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({ name, path: window.location.pathname, props: props ?? {} });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/events", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch {
    /* stil */
  }
}
