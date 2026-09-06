"use client";

export function PrintButton({ label }: { label: string }) {
  return (
    <button onClick={() => window.print()} className="ph-btn ph-btn-ghost text-sm print:hidden">
      🖨 {label}
    </button>
  );
}
