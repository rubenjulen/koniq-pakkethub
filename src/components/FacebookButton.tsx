import { facebookLoginAction } from "@/app/(site)/social-actions";

/** "Doorgaan met Facebook" — gesimuleerde social login (integratiegrens). */
export function FacebookButton({ label, note }: { label: string; note?: string }) {
  return (
    <form action={facebookLoginAction}>
      <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1877F2] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1566d8]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z" />
        </svg>
        {label}
      </button>
      {note && <p className="mt-1.5 text-center text-[11px] text-slate-400">{note}</p>}
    </form>
  );
}
