/**
 * PakketHub-merk: gesegmenteerde zeshoek (flat-top) met een cadeau/pakket erin,
 * plus het woordmerk "PakketHub". Monochroom, net als de huisstijl:
 *  - op donkere achtergrond: wit (light)
 *  - op lichte achtergrond: antraciet, met "Hub" in merkoranje als subtiel accent
 */
function hexEdges(cx: number, cy: number, r: number, trim = 0.16) {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  });
  return pts.map((p, i) => {
    const q = pts[(i + 1) % 6];
    const x1 = p[0] + (q[0] - p[0]) * trim, y1 = p[1] + (q[1] - p[1]) * trim;
    const x2 = q[0] - (q[0] - p[0]) * trim, y2 = q[1] - (q[1] - p[1]) * trim;
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }).join(" ");
}

export function LogoMark({ size = 40, color = "currentColor", accent }: { size?: number; color?: string; accent?: string }) {
  const a = accent ?? color;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden fill="none">
      {/* Gesegmenteerde zeshoek */}
      <path d={hexEdges(32, 32, 27)} stroke={color} strokeWidth="3.4" strokeLinecap="round" />
      {/* Cadeau/pakket */}
      <g stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        <rect x="22" y="33" width="20" height="13" rx="1.5" />
        <path d="M20 30.5 H44 V33 H20 Z" fill="none" />
        <line x1="32" y1="30.5" x2="32" y2="46" stroke={a} />
        {/* strik */}
        <path d="M32 30 C 30 24, 24 24, 25 28 C 25.5 30, 29 30.2, 32 30" stroke={a} fill="none" />
        <path d="M32 30 C 34 24, 40 24, 39 28 C 38.5 30, 35 30.2, 32 30" stroke={a} fill="none" />
      </g>
    </svg>
  );
}

export function Logo({ size = 34, showWord = true, light = false }: { size?: number; showWord?: boolean; light?: boolean }) {
  const color = light ? "#ffffff" : "#2e2e2e";
  const accent = light ? "#ffffff" : "#e9481c";
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} color={color} accent={accent} />
      {showWord && (
        <span className={`text-xl font-extrabold tracking-tight ${light ? "text-white" : "text-slate-900"}`}>
          Pakket<span style={{ color: light ? "#ffffff" : "#e9481c" }}>Hub</span>
        </span>
      )}
    </span>
  );
}
