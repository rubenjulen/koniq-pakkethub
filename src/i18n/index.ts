import "server-only";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, isLocale, pickFromAcceptLanguage, type Locale } from "./config";
import type { Messages } from "./messages/nl";
import nl from "./messages/nl";
import en from "./messages/en";
import pt from "./messages/pt";
import es from "./messages/es";
import fr from "./messages/fr";
import zh from "./messages/zh";

const DICTS: Record<Locale, Messages> = { nl, en, pt, es, fr, zh };

/** Huidige taal: cookie 'locale' → anders Accept-Language → anders default. */
export async function getLocale(): Promise<Locale> {
  const c = (await cookies()).get("locale")?.value;
  if (isLocale(c)) return c;
  const al = (await headers()).get("accept-language");
  return pickFromAcceptLanguage(al);
}

/** Woordenboek voor de huidige taal. */
export async function getMessages(): Promise<Messages> {
  return DICTS[await getLocale()];
}

export function messagesFor(locale: Locale): Messages {
  return DICTS[locale];
}
