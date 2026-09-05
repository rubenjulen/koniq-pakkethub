/** Compacte staaf-sparkline (inline SVG) — bv. actieve gebruikers per dag. */
export function Sparkline({ values, labels, height = 56 }: { values: number[]; labels?: string[]; height?: number }) {
  const n = Math.max(values.length, 1);
  const max = Math.max(1, ...values);
  const gap = 3;
  const bw = 14;
  const width = n * bw + (n - 1) * gap;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" role="img" aria-label="Activiteit per dag">
      {values.map((v, i) => {
        const h = Math.round((v / max) * (height - 14));
        const x = i * (bw + gap);
        const y = height - h;
        const last = i === values.length - 1;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={Math.max(h, 2)} rx={2}
              fill={last ? "var(--color-orange-600, #6ea82c)" : "var(--color-orange-300, #b6d98a)"} />
            {v > 0 && <text x={x + bw / 2} y={y - 3} textAnchor="middle" fontSize="9" fill="#94a3b8">{v}</text>}
            {labels && <text x={x + bw / 2} y={height - 1} textAnchor="middle" fontSize="7" fill="#cbd5e1">{labels[i]}</text>}
          </g>
        );
      })}
    </svg>
  );
}
