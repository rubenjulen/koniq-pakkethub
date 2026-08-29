/**
 * Adapter-configuratie. Elke externe integratie (betalen, KYC, notificaties, routing, AI)
 * heeft een interface + een SIMULATED-implementatie. Zolang er geen echte provider is
 * geconfigureerd, draait alles op de simulatie zodat je in testen ziet hoe het werkt.
 *
 * Livegang = zet de betreffende env-var en implementeer de 'real'-tak achter dezelfde
 * interface. De rest van de applicatie verandert niet.
 */
export type ProviderMode = "SIMULATED" | "LIVE";

function mode(envKey: string): ProviderMode {
  return process.env[envKey] === "LIVE" ? "LIVE" : "SIMULATED";
}

export const PROVIDERS = {
  payments: {
    mode: mode("PAYMENTS_MODE"),
    name: process.env.PAYMENTS_PROVIDER ?? "BugaWuga Pay (sandbox)",
    // Echte provider zou hier zijn: Mollie / Stripe / gelicentieerde escrow-partij.
  },
  kyc: {
    mode: mode("KYC_MODE"),
    name: process.env.KYC_PROVIDER ?? "BugaWuga Verify (sandbox)",
  },
  notifications: {
    mode: mode("NOTIFY_MODE"),
    name: process.env.NOTIFY_PROVIDER ?? "BugaWuga Notify (sandbox)",
  },
  routing: {
    mode: mode("ROUTING_MODE"),
    name: process.env.ROUTING_PROVIDER ?? "BugaWuga Routing (sandbox)",
  },
  ai: {
    mode: mode("AI_MODE"),
    name: process.env.AI_PROVIDER ?? "BugaWuga Assist (sandbox)",
  },
} as const;

export const PLATFORM_FEE_PCT = 0.045;     // BugaWuga-commissie 4,5% (founder: 4–5% van totaal)
export const PLATFORM_FEE_MIN_EUR = 2;     // minimum servicebijdrage
export const BASE_CURRENCY = "EUR";
export const FX_RATES: Record<string, number> = { EUR: 1, SRD: 38.5, USD: 1.08 };

export function isSimulated(p: keyof typeof PROVIDERS) {
  return PROVIDERS[p].mode === "SIMULATED";
}
