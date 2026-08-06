/**
 * PakketHub deterministische eligibility-engine (rule_version v1).
 *
 * Uitkomsten (van best naar meest beperkend):
 *   ALLOW        — mag via crowdshipping.
 *   STEP_UP      — extra verificatie (KYC) vereist voordat waarde beweegt.
 *   REVIEW       — handmatige beoordeling door PakketHub-medewerker.
 *   HOLD         — beschermende blokkade (reserve; hier niet automatisch getriggerd).
 *   FREIGHT_ONLY — niet via reiziger; alleen professionele freight.
 *   REJECT       — nooit toegestaan.
 *
 * Deze engine mag NOOIT door een AI-suggestie worden omzeild. Het bepaalt geen
 * douanelegaliteit en geeft geen fondsen vrij — dat gebeurt in aparte stappen.
 */

export type Decision = "ALLOW" | "STEP_UP" | "REVIEW" | "HOLD" | "FREIGHT_ONLY" | "REJECT";

export const RULE_VERSION = "v1";

const SEVERITY: Record<Decision, number> = {
  ALLOW: 0,
  STEP_UP: 1,
  REVIEW: 2,
  HOLD: 3,
  FREIGHT_ONLY: 4,
  REJECT: 5,
};

export type CategoryRule = {
  code: string;
  name: string;
  traveler_eligible: boolean;
  requires_review: boolean;
  prohibited: boolean;
  dangerous_goods: boolean;
  max_value_eur: number | null;
};

export type CorridorLimits = {
  max_item_value_eur: number;
  max_parcel_weight_kg: number;
  max_items_per_parcel: number;
  status: string;      // PLANNED|PILOT|LIVE|PAUSED
  kill_switch: boolean;
};

export type EligibilityInput = {
  items: { description: string; quantity: number; unit_value: number; category_code: string }[];
  isSealedClosed: boolean;
  declaredWeightKg: number | null;
  corridor: CorridorLimits;
  categories: Record<string, CategoryRule>;
  senderKycVerified: boolean;
};

export type EligibilityResult = {
  decision: Decision;
  reasons: string[];
  totalValueEur: number;
  totalItems: number;
};

export function evaluateEligibility(input: EligibilityInput): EligibilityResult {
  const reasons: string[] = [];
  let worst: Decision = "ALLOW";
  const raise = (d: Decision, reason: string) => {
    if (SEVERITY[d] > SEVERITY[worst]) worst = d;
    reasons.push(reason);
  };

  const { corridor, categories, items } = input;

  // Corridor-status / kill switch.
  if (corridor.kill_switch) raise("HOLD", "Corridor-kill-switch is actief — nieuwe zendingen zijn tijdelijk geblokkeerd.");
  if (corridor.status === "PLANNED") raise("REVIEW", "Deze corridor is nog niet geactiveerd (planned).");
  if (corridor.status === "PAUSED") raise("HOLD", "Deze corridor is gepauzeerd.");

  // Mystery-package gate (FR-SHP-004): gesloten/niet-inspecteerbaar pakket.
  if (input.isSealedClosed) {
    raise("FREIGHT_ONLY", "Gesloten, niet-inspecteerbaar pakket — niet toegestaan via reiziger; alleen professionele freight.");
  }

  // Geen items opgegeven.
  if (items.length === 0) raise("REVIEW", "Geen items opgegeven — een volledige itemlijst is verplicht.");

  let totalValue = 0;
  let totalItems = 0;

  for (const it of items) {
    const qty = Math.max(1, it.quantity || 1);
    totalItems += qty;
    const lineValue = (it.unit_value || 0) * qty;
    totalValue += lineValue;

    const cat = categories[it.category_code] ?? categories["UNKNOWN"];
    const label = it.description || cat?.name || it.category_code;

    if (!cat) {
      raise("REVIEW", `Onbekende categorie voor "${label}" — beoordeling vereist.`);
      continue;
    }
    if (cat.prohibited) {
      raise("REJECT", `"${label}" (${cat.name}) is verboden en mag niet worden verzonden.`);
      continue;
    }
    if (cat.dangerous_goods) {
      raise("FREIGHT_ONLY", `"${label}" (${cat.name}) is gevaarlijke goederen — niet via reiziger.`);
    }
    if (cat.code === "UNKNOWN") {
      raise("REVIEW", `Categorie voor "${label}" is niet gespecificeerd — specificeer de inhoud.`);
    } else if (!cat.traveler_eligible) {
      if (cat.requires_review) raise("REVIEW", `"${label}" (${cat.name}) vereist handmatige beoordeling.`);
      else raise("FREIGHT_ONLY", `"${label}" (${cat.name}) staat niet op de positieve lijst — alleen via freight.`);
    } else if (cat.requires_review) {
      raise("REVIEW", `"${label}" (${cat.name}) staat op de lijst maar vereist een controle.`);
    }

    // Waarde-limiet per categorie en per corridor.
    const catMax = cat.max_value_eur;
    if (catMax != null && it.unit_value > catMax) {
      raise("REVIEW", `Waarde van "${label}" (€${it.unit_value}) overschrijdt categorielimiet €${catMax}.`);
    }
    if (it.unit_value > corridor.max_item_value_eur) {
      raise("REVIEW", `Waarde van "${label}" (€${it.unit_value}) overschrijdt corridorlimiet €${corridor.max_item_value_eur}.`);
    }
  }

  // Aantal- en gewichtslimieten.
  if (totalItems > corridor.max_items_per_parcel) {
    raise("REVIEW", `Aantal items (${totalItems}) overschrijdt corridorlimiet (${corridor.max_items_per_parcel}).`);
  }
  if (input.declaredWeightKg != null && input.declaredWeightKg > corridor.max_parcel_weight_kg) {
    raise("REVIEW", `Gewicht (${input.declaredWeightKg} kg) overschrijdt corridorlimiet (${corridor.max_parcel_weight_kg} kg).`);
  }

  // Verified identity before value movement (spine). Alleen relevant als de rest OK is.
  if (worst === "ALLOW" && !input.senderKycVerified) {
    raise("STEP_UP", "Afzender is nog niet geverifieerd — verificatie vereist voordat waarde beweegt.");
  }

  if (worst === "ALLOW") reasons.push("Alle items staan op de positieve lijst en binnen de corridorlimieten.");

  return { decision: worst, reasons, totalValueEur: Math.round(totalValue * 100) / 100, totalItems };
}

export const DECISION_LABEL: Record<Decision, string> = {
  ALLOW: "Toegestaan",
  STEP_UP: "Verificatie vereist",
  REVIEW: "Handmatige beoordeling",
  HOLD: "Geblokkeerd (hold)",
  FREIGHT_ONLY: "Alleen freight",
  REJECT: "Geweigerd",
};

export const DECISION_TONE: Record<Decision, "ok" | "warn" | "bad"> = {
  ALLOW: "ok",
  STEP_UP: "warn",
  REVIEW: "warn",
  HOLD: "bad",
  FREIGHT_ONLY: "warn",
  REJECT: "bad",
};
