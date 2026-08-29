/**
 * BugaWuga-hero: passagiers stappen bij schemering in het vliegtuig (trap +
 * rij reizigers met bagage). Zelfstandige SVG in de merkkleuren groen/bruin —
 * geen externe afbeelding, schaalt scherp en laadt direct.
 */
function Passenger({ x, y, s = 1, flip = false }: { x: number; y: number; s?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -s : s},${s})`} fill="#2a2016">
      <circle cx="0" cy="-38" r="7" />
      <path d="M-8 -30 q8 -6 16 0 l4 30 q-12 5 -24 0 Z" />
      <path d="M-6 0 l-3 26 l6 0 l4 -24 Z" />
      <path d="M4 0 l5 25 l6 -2 l-5 -23 Z" />
      <path d="M8 -26 q9 3 12 16 l-6 3 q-4 -12 -10 -14 Z" />
      <rect x="16" y="-14" width="16" height="22" rx="3" fill="#6ea82c" />
      <line x1="24" y1="-24" x2="24" y2="-14" stroke="#2a2016" strokeWidth="2.4" strokeLinecap="round" />
    </g>
  );
}

export function BoardingHero({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1200 620" className={className}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="bw-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b2416" />
          <stop offset="0.55" stopColor="#4a3b26" />
          <stop offset="1" stopColor="#6b5836" />
        </linearGradient>
        <radialGradient id="bw-sun" cx="0.72" cy="0.86" r="0.5">
          <stop offset="0" stopColor="#e9b04c" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#c98a2c" stopOpacity="0.18" />
          <stop offset="1" stopColor="#c98a2c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bw-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3020" />
          <stop offset="1" stopColor="#2a2216" />
        </linearGradient>
      </defs>

      <rect width="1200" height="620" fill="url(#bw-sky)" />
      <rect width="1200" height="620" fill="url(#bw-sun)" />

      {/* verre terminal + torens, silhouet */}
      <g fill="#241d12" opacity="0.7">
        <rect x="0" y="352" width="1200" height="80" />
        <rect x="90" y="300" width="120" height="52" />
        <rect x="250" y="322" width="80" height="30" />
        <rect x="980" y="286" width="60" height="66" />
        <rect x="1006" y="262" width="8" height="26" />
      </g>

      {/* tarmac */}
      <rect x="0" y="430" width="1200" height="190" fill="url(#bw-ground)" />
      <g stroke="#efe6cf" strokeOpacity="0.22" strokeWidth="4" strokeDasharray="34 30">
        <line x1="0" y1="556" x2="1200" y2="556" />
      </g>
      <line x1="0" y1="430" x2="1200" y2="430" stroke="#7a6640" strokeOpacity="0.5" strokeWidth="2" />

      {/* Vliegtuig — neus links, staart rechts met groene vin */}
      <g transform="translate(430,196)">
        {/* vleugel achter romp */}
        <path d="M300 60 L560 120 L600 132 L320 78 Z" fill="#b9b09a" />
        <path d="M470 118 L500 176 L520 176 L500 116 Z" fill="#8f866f" />{/* motor */}
        <ellipse cx="505" cy="176" rx="20" ry="12" fill="#6b6350" />
        {/* romp */}
        <path d="M40 70 C 90 40, 620 34, 660 62 C 664 66, 664 80, 660 84 C 620 112, 120 112, 60 96 C 40 90, 24 82, 40 70 Z" fill="#efe9da" />
        <path d="M40 70 C 90 40, 620 34, 660 62 L 660 66 C 620 44, 120 46, 48 74 Z" fill="#ffffff" opacity="0.5" />
        {/* neus + cockpitraam */}
        <path d="M40 70 C 30 74, 30 82, 44 86 C 40 80, 40 78, 44 74 Z" fill="#d9d2c0" />
        <path d="M56 66 q14 -6 24 -3 l-4 10 q-12 -2 -22 3 Z" fill="#3a4a55" />
        {/* raampjes */}
        <g fill="#4a5a66">
          {Array.from({ length: 22 }).map((_, i) => <circle key={i} cx={110 + i * 24} cy="70" r="4.5" />)}
        </g>
        {/* cheatline in merkgroen */}
        <path d="M60 84 C 200 92, 560 92, 656 78 L 656 82 C 560 96, 200 96, 62 90 Z" fill="#6ea82c" />
        {/* staartvin (groen) + stabilo */}
        <path d="M604 60 L672 -8 L692 -8 L664 66 Z" fill="#6ea82c" />
        <path d="M636 40 L690 26 L700 30 L648 52 Z" fill="#557f1d" />
        {/* deur waar de trap aansluit */}
        <rect x="150" y="52" width="20" height="34" rx="4" fill="#2f3a42" />
      </g>

      {/* Trap (airstair) naar de voordeur */}
      <g transform="translate(470,282)">
        <path d="M120 0 L150 0 L60 150 L20 150 Z" fill="#8a7f66" />
        <g stroke="#5a4f3a" strokeWidth="3">
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={i} x1={116 - i * 12} y1={i * 18} x2={150 - i * 12} y2={i * 18} />
          ))}
        </g>
        <line x1="126" y1="-6" x2="34" y2="150" stroke="#6ea82c" strokeWidth="5" strokeLinecap="round" />
        <rect x="18" y="150" width="150" height="12" rx="3" fill="#4a4030" />
        <circle cx="40" cy="168" r="8" fill="#1c160e" /><circle cx="150" cy="168" r="8" fill="#1c160e" />
      </g>

      {/* schaduwen op de grond */}
      <g fill="#000" opacity="0.28">
        <ellipse cx="520" cy="452" rx="70" ry="10" />
        <ellipse cx="470" cy="474" rx="30" ry="8" />
        <ellipse cx="430" cy="486" rx="30" ry="8" />
        <ellipse cx="378" cy="496" rx="30" ry="8" />
      </g>

      {/* Passagiers die instappen — op de trap en in de rij */}
      <Passenger x={548} y={366} s={0.82} />
      <Passenger x={520} y={392} s={0.9} />
      <Passenger x={470} y={470} s={1.02} />
      <Passenger x={424} y={484} s={1.08} />
      <Passenger x={372} y={496} s={1.14} />
    </svg>
  );
}
