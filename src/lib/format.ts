export function eur(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? parseFloat(value) : value ?? 0;
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n || 0);
}

export function dateNL(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

/** Grove periode (maand + jaar) — voor publieke, geanonimiseerde weergave. */
export function monthNL(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("nl-NL", { month: "long", year: "numeric" }).format(date);
}

export function dateTimeNL(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(date);
}

export function timeAgo(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return "zojuist";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min geleden`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} uur geleden`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} d geleden`;
  return dateNL(date);
}

export const SHIPMENT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Concept",
  SCREENING: "Screening",
  QUOTED: "Aanbod ontvangen",
  BOOKED: "Geboekt",
  INTAKE: "Intake bij hub",
  SEALED: "Verzegeld",
  IN_CUSTODY: "In beheer",
  IN_TRANSIT: "Onderweg",
  CUSTOMS: "Douane",
  READY: "Klaar voor afhalen",
  DELIVERED: "Afgeleverd",
  RETURNED: "Retour",
  CLOSED: "Afgesloten",
};

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}
