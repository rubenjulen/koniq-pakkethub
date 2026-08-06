import "server-only";

/**
 * Routing/ETA-adapter. SIMULATED = deterministische schatting op basis van modus en corridor.
 * Echte livegang koppelt een maps/geo-API (bijv. Google/Mapbox/HERE) + luchtvaart-/vaarschema's.
 */
type Mode = "CROWDSHIP" | "ROAD" | "AIR" | "SEA" | "HUB";

const BASE_DAYS: Record<Mode, number> = { CROWDSHIP: 9, ROAD: 3, AIR: 5, SEA: 28, HUB: 1 };

export function estimateEta(opts: { mode: Mode; fromCountry?: string; toCountry?: string }): {
  days: number;
  label: string;
} {
  const base = BASE_DAYS[opts.mode] ?? 7;
  const intl = opts.fromCountry && opts.toCountry && opts.fromCountry !== opts.toCountry ? 2 : 0;
  const days = base + intl;
  return { days, label: `${days}–${days + 3} dagen (indicatief)` };
}

export function optimizeDispatch(jobs: { id: string; weightKg: number }[], vehicleCapacityKg: number) {
  // Simpele first-fit bundeling — plaatsvervanger voor echte route-optimalisatie.
  const sorted = [...jobs].sort((a, b) => b.weightKg - a.weightKg);
  const runs: { load: number; jobIds: string[] }[] = [];
  for (const j of sorted) {
    let run = runs.find((r) => r.load + j.weightKg <= vehicleCapacityKg);
    if (!run) { run = { load: 0, jobIds: [] }; runs.push(run); }
    run.load += j.weightKg;
    run.jobIds.push(j.id);
  }
  return runs;
}
