/** 1–4 sterren-weergave (BugaWuga-schaal: 1 = slecht, 4 = goed). */
export function Stars({ value, size = 16 }: { value: number | null; size?: number }) {
  const v = Math.round(value ?? 0);
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={value ? `${value} / 4` : "geen beoordeling"}>
      {[1, 2, 3, 4].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden
          fill={i <= v ? "#6ea82c" : "none"} stroke={i <= v ? "#6ea82c" : "#cbd5e1"} strokeWidth="1.6">
          <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.9l-5.8 3 1.1-6.45-4.7-4.6 6.5-.95z" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}
