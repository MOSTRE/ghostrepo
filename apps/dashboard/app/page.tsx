import SearchBox from '../components/SearchBox';

export default function Home() {
  return (
    <div className="py-10 text-center">
      <p className="font-mono text-sm text-ghost">👻 GhostRepo</p>
      <h1 className="mx-auto mt-4 max-w-2xl text-4xl font-bold leading-tight">
        Is this repo actually dead, or does it just need some work?
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-slate-400">
        Thousands of useful repositories sit untouched for years. GhostRepo scans the signals —
        commits, issues, dependencies, CI, docs — and tells you which ones are worth reviving.
      </p>
      <p className="mt-6 font-mono text-sm text-slate-500">Enter a GitHub repository</p>
      <SearchBox />
      <div className="mx-auto mt-10 grid max-w-3xl gap-4 text-left sm:grid-cols-3">
        {[
          ['Scan', 'Health score, activity, CI, docs and dependencies in one view.'],
          ['Understand', 'Every classification ships with the evidence behind it.'],
          ['Revive', 'A prioritized plan with effort estimates. Nothing auto-pushes.'],
        ].map(([t, d]) => (
          <div key={t} className="rounded-lg border border-edge bg-panel p-4">
            <h2 className="font-semibold">{t}</h2>
            <p className="mt-1 text-sm text-slate-400">{d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
