import "server-only";

/**
 * AI-assist-adapter. SIMULATED = deterministische heuristiek (trefwoorden). Geeft suggesties;
 * mag NOOIT de deterministische eligibility-engine of een uitbetaling overrulen (baseline §06).
 * Echte livegang koppelt een LLM (Claude) achter dezelfde suggest-interface.
 */
const KEYWORDS: [RegExp, string][] = [
  [/document|paspoort|brief|papier|contract/i, "DOCS"],
  [/kleding|shirt|broek|jas|textiel|schoen/i, "CLOTHING"],
  [/koffie|snoep|voedsel|eten|kruiden|thee|suiker/i, "FOOD_DRY"],
  [/cosm|creme|parfum|verzorg|shampoo|lotion/i, "COSMETICS"],
  [/speelgoed|toy|pop|lego|knuffel/i, "TOYS"],
  [/telefoon|kabel|oplader|elektro|usb|koptelefoon/i, "ELECTRONICS_SMALL"],
  [/medicijn|pillen|recept|medic/i, "MEDICINE"],
  [/batterij|accu|powerbank/i, "BATTERIES"],
  [/vloeistof|drank|olie|fles/i, "LIQUIDS"],
  [/geld|cash|contant/i, "CASH"],
  [/wapen|mes|munitie/i, "WEAPONS"],
];

export function suggestCategory(description: string): { code: string; confidence: number } {
  for (const [re, code] of KEYWORDS) {
    if (re.test(description)) return { code, confidence: 0.9 };
  }
  return { code: "UNKNOWN", confidence: 0.3 };
}

export function draftSupportReply(context: { subject: string; kind: string }): string {
  const openers: Record<string, string> = {
    DAMAGE: "Vervelend dat je pakket beschadigd aankwam.",
    LOSS: "Vervelend dat je pakket zoek is.",
    DELAY: "Excuses voor de vertraging van je zending.",
    MISMATCH: "Bedankt voor je melding over de inhoud.",
  };
  const opener = openers[context.kind] ?? "Bedankt voor je bericht.";
  return `${opener} We hebben je melding "${context.subject}" geopend en de custody-historie, foto's en verzegeling opgevraagd. Een medewerker beoordeelt dit en koppelt binnen 2 werkdagen terug. Je betaling blijft veilig vastgehouden zolang de zaak loopt.`;
}
