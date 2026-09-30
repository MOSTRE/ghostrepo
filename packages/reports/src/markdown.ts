import type { RepoAnalysis } from '@ghostrepo/core';

function fmtMonths(m: number | null): string {
  if (m === null) return 'unknown';
  if (m < 1) return 'less than a month ago';
  if (m < 2) return 'about a month ago';
  return `${m.toFixed(0)} months ago`;
}

export function toMarkdownReport(a: RepoAnalysis): string {
  const lines: string[] = [];
  lines.push(`# GhostRepo Report — ${a.repo}`);
  lines.push('');
  lines.push(
    `> Generated ${a.fetchedAt}. Data from the GitHub API; unavailable metrics are marked explicitly.`,
  );
  lines.push('');
  lines.push(`**Health:** ${a.score.total}/${a.score.max}`);
  lines.push('');
  lines.push(`**Maintenance:** ${a.maintenance.label}`);
  lines.push('');
  lines.push('## Evidence');
  lines.push('');
  for (const e of a.maintenance.evidence) lines.push(`- ${e}`);
  lines.push('');
  lines.push('## Score breakdown');
  lines.push('');
  lines.push('| Category | Score | Detail |');
  lines.push('| --- | --- | --- |');
  for (const c of a.score.categories) {
    lines.push(`| ${c.label} | ${c.earned}/${c.max} | ${c.detail} |`);
  }
  lines.push('');
  lines.push('## Repository');
  lines.push('');
  lines.push(`- Description: ${a.metadata.description ?? '—'}`);
  lines.push(
    `- Stars: ${a.metadata.stars} · Forks: ${a.metadata.forks} · Watchers: ${a.metadata.watchers}`,
  );
  lines.push(`- Last push: ${fmtMonths(a.activity.monthsSincePush)} (${a.metadata.pushedAt})`);
  lines.push(`- Open issues: ${a.metadata.openIssues} · Open PRs: ${a.metadata.openPrs}`);
  lines.push(`- Releases: ${a.activity.releaseCount ?? 'unavailable'}`);
  lines.push(`- CI: ${a.ci.status} — ${a.ci.detail}`);
  lines.push(`- Documentation: ${a.documentation.status} — ${a.documentation.detail}`);
  lines.push('');
  lines.push('## Dependencies');
  lines.push('');
  if (a.dependencies.items.length === 0) {
    lines.push('No parsed dependencies. ' + (a.dependencies.unavailable.join('; ') || ''));
  } else {
    lines.push('| package | current | latest | status |');
    lines.push('| --- | --- | --- | --- |');
    for (const d of a.dependencies.items) {
      lines.push(`| ${d.name} | ${d.current} | ${d.latest ?? 'unknown'} | ${d.status} |`);
    }
  }
  lines.push('');
  lines.push('## Revival plan');
  lines.push('');
  for (const item of a.revivalPlan) {
    lines.push(`### ${item.priority} — ${item.title}`);
    lines.push('');
    lines.push(`- Area: ${item.area}`);
    lines.push(`- Why: ${item.why}`);
    lines.push(`- Current: ${item.current}`);
    lines.push(`- Change: ${item.change}`);
    lines.push(`- Risk: ${item.risk}`);
    lines.push(`- Effort: ${item.effort}`);
    lines.push('');
  }
  if (a.unavailable.length > 0) {
    lines.push('## Unavailable metrics');
    lines.push('');
    for (const u of a.unavailable) lines.push(`- ${u}`);
    lines.push('');
  }
  lines.push('---');
  lines.push(
    '*Methodology: docs/scoring.md. Classifications are heuristic and evidence-backed, never absolute.*',
  );
  lines.push('');
  return lines.join('\n');
}
