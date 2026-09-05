"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/track";

/**
 * Meet niet-transactionele acties:
 *  - page_view bij elke route-wissel
 *  - kliks op elementen met een data-ev attribuut (widget-kliks e.d.)
 * Eén keer gemount in de layout; werkt ook voor server-gerenderde links.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    track("page_view", { path: pathname });
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest?.("[data-ev]") as HTMLElement | null;
      if (el) {
        const name = el.getAttribute("data-ev");
        if (name) track(name);
      }
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true } as EventListenerOptions);
  }, []);

  return null;
}
