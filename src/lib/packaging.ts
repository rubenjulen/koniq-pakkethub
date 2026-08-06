/** Volumetrisch gewicht (versioned divisor). Standaard luchtvracht: 5000. */
export const VOLUMETRIC_DIVISOR = 5000;
export const VOLUMETRIC_VERSION = "v1";

export function volumetricKg(lengthCm: number | null, widthCm: number | null, heightCm: number | null): number | null {
  if (!lengthCm || !widthCm || !heightCm) return null;
  return Math.round(((lengthCm * widthCm * heightCm) / VOLUMETRIC_DIVISOR) * 100) / 100;
}

export function chargeableKg(actualKg: number | null, volKg: number | null): number | null {
  if (actualKg == null && volKg == null) return null;
  return Math.max(actualKg ?? 0, volKg ?? 0);
}
