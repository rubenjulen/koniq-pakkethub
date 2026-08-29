/**
 * BugaWuga-merk (voor nu, herbouwd als SVG naar de originele huisstijl):
 * een fris groen tegel-embleem met een witte kangoeroe (de buidel-drager),
 * plus het woordmerk "Bugawuga" — "Buga" groen, "wuga" bruin.
 *  - op donkere achtergrond: woordmerk wit (light)
 *  - op lichte achtergrond: groen/bruin
 */
const GREEN = "#6ea82c";
const BROWN = "#5a4a2e";

/** Kangoeroe-silhouet (rechtop, naar rechts, staart naar beneden, achterpoot
 *  vooruit) — één schoon pad, wit ingevuld. */
function Kangaroo({ fill = "#fff" }: { fill?: string }) {
  return (
    <path
      fill={fill}
      d="M52 21C49 19 48 16 46 15C46 10 48 6 50 7C50 10 49 13 48 14C45 14 43 17 41 20C37 24 33 28 31 34C30 38 31 42 34 44C31 45 28 48 26 52C25 54 27 55 29 53C32 50 35 48 38 47C42 47 46 49 49 51C50 51 50 49 48 48C45 46 43 45 42 42C42 38 43 35 45 33C47 33 49 32 49 35C50 34 50 31 48 30C46 29 46 26 48 25C49 24 51 23 52 21Z"
    />
  );
}

export function LogoMark({ size = 40 }: { size?: number; color?: string; accent?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden fill="none">
      <rect x="3" y="3" width="58" height="58" rx="15" fill={GREEN} />
      <Kangaroo />
    </svg>
  );
}

export function Logo({ size = 34, showWord = true, light = false }: { size?: number; showWord?: boolean; light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} />
      {showWord && (
        <span className="text-xl font-extrabold tracking-tight">
          <span style={{ color: light ? "#ffffff" : GREEN }}>Buga</span>
          <span style={{ color: light ? "#e8e0cf" : BROWN }}>wuga</span>
        </span>
      )}
    </span>
  );
}
