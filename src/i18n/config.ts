export const LOCALES = ["nl", "en", "pt", "es", "fr", "zh"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "nl";

export const LOCALE_META: Record<Locale, { label: string; native: string; flag: string }> = {
  nl: { label: "Dutch", native: "Nederlands", flag: "🇳🇱" },
  en: { label: "English", native: "English", flag: "🇬🇧" },
  pt: { label: "Portuguese (BR)", native: "Português", flag: "🇧🇷" },
  es: { label: "Spanish", native: "Español", flag: "🇪🇸" },
  fr: { label: "French", native: "Français", flag: "🇫🇷" },
  zh: { label: "Chinese", native: "中文", flag: "🇨🇳" },
};

export function isLocale(v: string | undefined | null): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v);
}

/** Kies de beste taal uit een Accept-Language header. */
export function pickFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  const parts = header.split(",").map((p) => {
    const [tag, q] = p.trim().split(";q=");
    return { tag: tag.toLowerCase().slice(0, 2), q: q ? parseFloat(q) : 1 };
  }).sort((a, b) => b.q - a.q);
  for (const p of parts) if (isLocale(p.tag)) return p.tag;
  return DEFAULT_LOCALE;
}
