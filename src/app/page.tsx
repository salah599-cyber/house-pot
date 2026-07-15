export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-950 px-6 py-24 text-zinc-50">
      <main className="flex w-full max-w-2xl flex-col items-center gap-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-3xl ring-1 ring-emerald-500/30">
          🏠
        </div>

        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-400">
            Shared living, simplified
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            House Pot
          </h1>
          <p className="mx-auto max-w-lg text-lg leading-8 text-zinc-400">
            Split rent, utilities, and groceries with roommates. Track who paid
            what and settle up without the spreadsheet chaos.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-medium text-zinc-950 transition hover:bg-emerald-400"
          >
            Get started
          </button>
          <button
            type="button"
            className="rounded-full border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900"
          >
            View demo
          </button>
        </div>
      </main>
    </div>
  );
}
