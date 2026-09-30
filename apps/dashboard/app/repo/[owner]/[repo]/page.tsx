import { Card, ScoreBar } from '../../../../components/Cards';
import { getAnalysis } from '../../../../lib/analysis';

export const dynamic = 'force-dynamic';

function months(m: number | null): string {
  if (m === null) return 'unknown';
  if (m < 1) return 'this month';
  if (m < 12) return `${m.toFixed(0)} months ago`;
  return `${(m / 12).toFixed(1)} years ago`;
}

export default async function RepoPage({ params }: { params: { owner: string; repo: string } }) {
  let analysis;
  let error: string | null = null;
  try {
    analysis = await getAnalysis(params.owner, params.repo);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  if (error || !analysis) {
    return (
      <div className="rounded-lg border border-red-900 bg-panel p-6">
        <h1 className="text-xl font-bold">
          Couldn&apos;t analyze {params.owner}/{params.repo}
        </h1>
        <p className="mt-2 font-mono text-sm text-red-400">{error}</p>
        <p className="mt-2 text-sm text-slate-400">
          The repo may not exist, or the GitHub API rate limit was reached. Set
          GHOSTREPO_GITHUB_TOKEN on the server for higher limits.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-mono text-2xl font-bold">{analysis.repo}</h1>
      {analysis.metadata.description && (
        <p className="mt-1 text-slate-400">{analysis.metadata.description}</p>
      )}
      <p className="mt-2 inline-block rounded-full border border-edge px-3 py-1 text-sm">
        {analysis.maintenance.label}
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card title="Health">
          <ScoreBar value={analysis.score.total} max={analysis.score.max} />
          <ul className="mt-4 space-y-1 text-sm">
            {analysis.score.categories.map((c) => (
              <li key={c.key} className="flex justify-between gap-2">
                <span className="text-slate-400">{c.label}</span>
                <span className="font-mono">
                  {c.earned}/{c.max}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Maintenance evidence">
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
            {analysis.maintenance.evidence.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Card>

        <Card title="Activity">
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-500">Last push</dt>
            <dd>{months(analysis.activity.monthsSincePush)}</dd>
            <dt className="text-slate-500">Stars / Forks</dt>
            <dd>
              {analysis.metadata.stars} / {analysis.metadata.forks}
            </dd>
            <dt className="text-slate-500">Open issues / PRs</dt>
            <dd>
              {analysis.metadata.openIssues} / {analysis.metadata.openPrs}
            </dd>
            <dt className="text-slate-500">CI</dt>
            <dd>
              {analysis.ci.status} — {analysis.ci.detail}
            </dd>
          </dl>
        </Card>

        <Card title="Dependencies">
          {analysis.dependencies.items.length === 0 ? (
            <p className="text-sm text-slate-400">No parsed dependencies.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th>package</th>
                  <th>current</th>
                  <th>latest</th>
                  <th>status</th>
                </tr>
              </thead>
              <tbody>
                {analysis.dependencies.items.slice(0, 20).map((d) => (
                  <tr key={d.name} className="border-t border-edge">
                    <td className="py-1 font-mono">{d.name}</td>
                    <td className="font-mono">{d.current}</td>
                    <td className="font-mono">{d.latest ?? 'unknown'}</td>
                    <td>{d.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Revival plan">
          <ol className="space-y-3">
            {analysis.revivalPlan.map((item, i) => (
              <li key={i} className="border-l-2 border-ghost pl-3">
                <p className="font-semibold">
                  <span className="mr-2 font-mono text-xs text-ghost">{item.priority}</span>
                  {item.title}
                </p>
                <p className="text-sm text-slate-400">{item.why}</p>
                <p className="text-sm text-slate-500">
                  Change: {item.change} Risk: {item.risk} Effort: {item.effort}
                </p>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {analysis.unavailable.length > 0 && (
        <p className="mt-4 text-xs text-slate-500">
          Unavailable metrics: {analysis.unavailable.join(', ')}
        </p>
      )}
    </div>
  );
}
