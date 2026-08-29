"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Labels = {
  opt_send: string; opt_deliver: string;
  rs_from: string; rs_to: string; rs_depart: string; rs_return: string; rs_search: string;
};

export function RouteSearch({ t }: { t: Labels }) {
  const router = useRouter();
  const [mode, setMode] = useState<"send" | "deliver">("send");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [depart, setDepart] = useState("");
  const [ret, setRet] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    if (depart) q.set("depart", depart);
    if (ret) q.set("return", ret);
    // Golf 1: stuur naar de juiste flow; de route-matching-marktplaats volgt in golf 2.
    const base = mode === "send" ? "/verzenden" : "/aanmelden";
    if (mode === "deliver") q.set("role", "TRAVELER");
    const qs = q.toString();
    router.push(qs ? `${base}?${qs}` : base);
  }

  const seg = "flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition";
  const fld = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500";

  return (
    <form onSubmit={submit} className="rounded-2xl bg-white/95 p-3 shadow-2xl ring-1 ring-black/5 backdrop-blur">
      <div className="mb-3 flex gap-1 rounded-xl bg-slate-100 p-1">
        <button type="button" onClick={() => setMode("send")}
          className={`${seg} ${mode === "send" ? "bg-orange-600 text-white shadow" : "text-slate-600"}`}>
          {t.opt_send}
        </button>
        <button type="button" onClick={() => setMode("deliver")}
          className={`${seg} ${mode === "deliver" ? "bg-orange-600 text-white shadow" : "text-slate-600"}`}>
          {t.opt_deliver}
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block"><span className="text-xs font-medium text-slate-500">{t.rs_from}</span>
          <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Amsterdam" className={fld} />
        </label>
        <label className="block"><span className="text-xs font-medium text-slate-500">{t.rs_to}</span>
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Paramaribo" className={fld} />
        </label>
        <label className="block"><span className="text-xs font-medium text-slate-500">{t.rs_depart}</span>
          <input value={depart} onChange={(e) => setDepart(e.target.value)} type="date" className={fld} />
        </label>
        <label className="block"><span className="text-xs font-medium text-slate-500">{t.rs_return}</span>
          <input value={ret} onChange={(e) => setRet(e.target.value)} type="date" className={fld} />
        </label>
      </div>
      <button type="submit" className="ph-btn ph-btn-primary mt-3 w-full">{t.rs_search}</button>
    </form>
  );
}
