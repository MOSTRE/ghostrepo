export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-edge bg-panel p-5">
      <h2 className="font-mono text-xs uppercase tracking-widest text-slate-500">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function ScoreBar({ value, max }: { value: number; max: number }) {
  const pct = Math.round((value / Math.max(1, max)) * 100);
  const color = pct >= 75 ? 'bg-green-400' : pct >= 45 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-3xl font-bold">
          {value}
          <span className="text-base text-slate-500">/{max}</span>
        </span>
        <span className="font-mono text-xs text-slate-500">{pct}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-edge">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
