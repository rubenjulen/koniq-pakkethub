/**
 * Zelfstandige SVG-illustratie: een reiziger loopt met koffer én pakket door de
 * vertrekhal naar de check-in. Huisstijlkleuren (antraciet + oranje + beige).
 * Geen externe afbeelding — schaalt scherp en laadt direct.
 */
export function AirportHero({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1200 620" className={className}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#242424" />
          <stop offset="0.6" stopColor="#2e2e2e" />
          <stop offset="1" stopColor="#1c1c1c" />
        </linearGradient>
        <linearGradient id="dawn" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e9481c" stopOpacity="0.30" />
          <stop offset="0.5" stopColor="#e9481c" stopOpacity="0.05" />
          <stop offset="1" stopColor="#cdbfa7" stopOpacity="0.10" />
        </linearGradient>
        <linearGradient id="glow" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#cdbfa7" stopOpacity="0.28" />
          <stop offset="1" stopColor="#cdbfa7" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="1200" height="620" fill="url(#sky)" />
      <rect width="1200" height="620" fill="url(#dawn)" />

      {/* Terminal-raamwand met stijlen */}
      <g opacity="0.5" stroke="#4a4a4a" strokeWidth="2">
        {Array.from({ length: 13 }).map((_, i) => <line key={i} x1={60 + i * 92} y1="40" x2={60 + i * 92} y2="470" />)}
        <line x1="40" y1="120" x2="1180" y2="120" />
        <line x1="40" y1="300" x2="1180" y2="470" opacity="0" />
      </g>
      {/* Zonlicht door de ramen */}
      <polygon points="720,60 980,60 1120,470 640,470" fill="#e9481c" opacity="0.06" />

      {/* Vliegtuig buiten */}
      <g transform="translate(770,150)" opacity="0.9">
        <path d="M0 40 L250 20 L300 24 L250 40 L60 52 Z" fill="#3a3a3a" />
        <path d="M250 22 L300 6 L312 8 L268 30 Z" fill="#e9481c" />
        <path d="M120 40 L150 78 L165 78 L150 40 Z" fill="#333" />
        <path d="M40 41 L15 20 L26 20 L60 40 Z" fill="#454545" />
        <circle cx="90" cy="41" r="3" fill="#cdbfa7" />
        <circle cx="120" cy="41" r="3" fill="#cdbfa7" />
      </g>

      {/* Vloer + glow */}
      <rect x="0" y="470" width="1200" height="150" fill="#202020" />
      <rect x="0" y="470" width="1200" height="150" fill="url(#glow)" />
      <line x1="0" y1="470" x2="1200" y2="470" stroke="#5a5a5a" strokeWidth="2" />
      {/* schaduw reiziger */}
      <ellipse cx="470" cy="560" rx="150" ry="14" fill="#000" opacity="0.35" />

      {/* Reiziger die naar check-in loopt (silhouet, met randlicht) */}
      <g transform="translate(360,250)">
        {/* rolkoffer */}
        <g>
          <rect x="205" y="118" width="70" height="120" rx="10" fill="#e9481c" />
          <rect x="205" y="118" width="70" height="120" rx="10" fill="#000" opacity="0.12" />
          <line x1="240" y1="60" x2="240" y2="118" stroke="#8a8a8a" strokeWidth="5" strokeLinecap="round" />
          <rect x="222" y="52" width="36" height="9" rx="4" fill="#8a8a8a" />
          <circle cx="216" cy="248" r="9" fill="#111" /><circle cx="264" cy="248" r="9" fill="#111" />
          <rect x="216" y="150" width="48" height="6" fill="#cdbfa7" opacity="0.7" />
        </g>
        {/* lichaam */}
        <g fill="#2a2a2a">
          <path d="M96 40 a24 24 0 1 1 0.1 0 Z" />{/* hoofd */}
          <path d="M70 78 q26 -14 52 0 l10 96 q-36 14 -72 0 Z" />{/* torso */}
          {/* benen in wandelpas */}
          <path d="M76 168 l-18 96 l20 4 l26 -92 Z" />
          <path d="M104 168 l24 90 l20 -6 l-24 -90 Z" />
          {/* voorste arm draagt pakket */}
          <path d="M122 96 q34 6 44 40 l-16 8 q-16 -28 -36 -30 Z" />
        </g>
        {/* randlicht (oranje) */}
        <path d="M72 58 q24 -12 50 0" stroke="#e9481c" strokeWidth="3" fill="none" opacity="0.7" />
        <path d="M96 20 a22 22 0 0 1 18 12" stroke="#e9481c" strokeWidth="3" fill="none" opacity="0.6" />

        {/* pakket onder de arm — met oranje lint */}
        <g transform="translate(150,120)">
          <rect x="0" y="0" width="60" height="46" rx="4" fill="#cdbfa7" />
          <rect x="0" y="0" width="60" height="46" rx="4" fill="#000" opacity="0.05" />
          <rect x="26" y="0" width="8" height="46" fill="#e9481c" />
          <rect x="0" y="20" width="60" height="8" fill="#e9481c" />
        </g>
      </g>

      {/* Vertrekbord-hint */}
      <g transform="translate(70,150)" opacity="0.85">
        <rect x="0" y="0" width="150" height="86" rx="6" fill="#181818" stroke="#3a3a3a" />
        <rect x="10" y="12" width="70" height="8" rx="2" fill="#e9481c" />
        <rect x="10" y="30" width="120" height="6" rx="2" fill="#4a4a4a" />
        <rect x="10" y="44" width="110" height="6" rx="2" fill="#4a4a4a" />
        <rect x="10" y="58" width="90" height="6" rx="2" fill="#cdbfa7" opacity="0.6" />
        <text x="96" y="20" fill="#cdbfa7" fontSize="9" fontFamily="monospace">SR</text>
      </g>
    </svg>
  );
}
