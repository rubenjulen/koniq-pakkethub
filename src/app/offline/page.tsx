export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="text-4xl">📦</div>
      <h1 className="text-xl font-bold">Je bent offline</h1>
      <p className="text-slate-600">
        BugaWuga kon de pagina niet laden. Zodra je weer verbinding hebt, kun je verder met je
        zendingen, aanbiedingen en berichten.
      </p>
      <a href="/" className="ph-btn ph-btn-primary">Opnieuw proberen</a>
    </main>
  );
}
