import chalk from 'chalk';
import Table from 'cli-table3';
import type { RepoAnalysis } from '@ghostrepo/core';
import { effortForScore } from '@ghostrepo/scoring';

const line = '────────────────────────────────────────';

export function printHeader(): void {
  console.log(chalk.bold.cyan('GhostRepo'));
  console.log(chalk.dim(line));
}

export function fmtAgo(months: number | null, pushedAt: string): string {
  if (months === null) return chalk.yellow('unknown (API unavailable)');
  if (months < 1) return 'less than a month ago';
  if (months < 12) return `${months.toFixed(0)} months ago`;
  return `${(months / 12).toFixed(1)} years ago (${pushedAt.slice(0, 10)})`;
}

function healthColor(n: number): (s: string) => string {
  if (n >= 75) return chalk.green;
  if (n >= 45) return chalk.yellow;
  return chalk.red;
}

function statusIcon(status: string): string {
  switch (status) {
    case 'passing':
    case 'good':
    case 'healthy':
      return chalk.green('●');
    case 'failing':
    case 'missing':
      return chalk.red('●');
    default:
      return chalk.yellow('●');
  }
}

export function printScan(a: RepoAnalysis): void {
  printHeader();
  console.log('');
  console.log(chalk.dim('Repository'));
  console.log(
    `  ${chalk.bold(a.repo)}${a.metadata.description ? chalk.dim(` — ${a.metadata.description.slice(0, 80)}`) : ''}`,
  );
  console.log('');
  console.log(chalk.dim('Health'));
  const color = healthColor(a.score.total);
  console.log(`  ${color(`${a.score.total} / ${a.score.max}`)}`);
  console.log('');
  console.log(chalk.dim('Last commit'));
  console.log(`  ${fmtAgo(a.activity.monthsSincePush, a.metadata.pushedAt)}`);
  console.log('');
  const t = new Table({
    head: [chalk.dim('metric'), chalk.dim('value')],
    colWidths: [20, 40],
    style: { head: [], border: [] },
  });
  t.push(
    ['Stars', String(a.metadata.stars)],
    ['Forks', String(a.metadata.forks)],
    ['Open issues', String(a.metadata.openIssues)],
    ['Pull requests', String(a.metadata.openPrs)],
    [
      'Releases',
      a.activity.releaseCount === null ? 'unavailable' : String(a.activity.releaseCount),
    ],
    [
      'Dependencies',
      a.dependencies.total === 0
        ? 'none parsed'
        : `${a.dependencies.outdated} outdated / ${a.dependencies.total}`,
    ],
    ['CI', `${statusIcon(a.ci.status)} ${a.ci.status} — ${a.ci.detail}`],
    [
      'Documentation',
      `${statusIcon(a.documentation.status === 'good' ? 'passing' : a.documentation.status === 'missing' ? 'missing' : 'warn')} ${a.documentation.detail}`,
    ],
    ['Tests', a.files.tests ? chalk.green('detected') : chalk.yellow('not detected')],
    ['Maintenance', chalk.bold(a.maintenance.label.toUpperCase())],
  );
  console.log(t.toString());
  if (a.unavailable.length > 0) {
    console.log('');
    console.log(chalk.yellow('Note: some metrics were unavailable: ' + a.unavailable.join(', ')));
  }
  if (a.rateLimited) {
    console.log(
      chalk.yellow('GitHub API rate limit reached. Set GHOSTREPO_GITHUB_TOKEN for full results.'),
    );
  }
  console.log('');
  console.log(chalk.dim(line));
  console.log('');
  console.log(chalk.bold('Suggested revival plan'));
  console.log('');
  const top = a.revivalPlan.slice(0, 6);
  top.forEach((item, i) => {
    console.log(
      `  ${chalk.cyan(`${i + 1}.`)} ${item.title} ${chalk.dim(`[${item.priority} · ${item.effort}]`)}`,
    );
  });
  console.log('');
  console.log(chalk.dim('Estimated modernization effort'));
  console.log(`  ${effortForScore(a.score.total)}`);
  console.log('');
  console.log(chalk.dim(line));
}

export function printScore(a: RepoAnalysis): void {
  printHeader();
  console.log('');
  console.log(
    `  ${chalk.bold('Ghost Score:')} ${healthColor(a.score.total)(`${a.score.total}/${a.score.max}`)}`,
  );
  console.log('');
  const t = new Table({
    head: [chalk.dim('category'), chalk.dim('score'), chalk.dim('detail')],
    colWidths: [20, 12, 48],
    style: { head: [], border: [] },
  });
  for (const c of a.score.categories) {
    t.push([c.label, `${c.earned}/${c.max}`, c.detail]);
  }
  console.log(t.toString());
  console.log('');
  console.log(
    chalk.dim('Methodology: docs/scoring.md · Weights configurable via GHOSTREPO_WEIGHT_*'),
  );
}

export function printDeps(a: RepoAnalysis): void {
  printHeader();
  console.log('');
  console.log(chalk.bold('Dependency Health'));
  console.log('');
  if (a.dependencies.items.length === 0) {
    console.log(chalk.dim('  No parsed dependencies.'));
    if (a.dependencies.unavailable.length > 0) {
      console.log(chalk.dim('  ' + a.dependencies.unavailable.join('; ')));
    }
    return;
  }
  const t = new Table({
    head: [chalk.dim('package'), chalk.dim('current'), chalk.dim('latest'), chalk.dim('status')],
    colWidths: [30, 16, 16, 18],
    style: { head: [], border: [] },
  });
  for (const d of a.dependencies.items) {
    const status =
      d.status === 'current'
        ? chalk.green(d.status)
        : d.status === 'unknown'
          ? chalk.dim(d.status)
          : chalk.yellow(d.status);
    t.push([d.name, d.current, d.latest ?? 'unknown', status]);
  }
  console.log(t.toString());
  console.log('');
  console.log(chalk.dim(`  ${a.dependencies.outdated} outdated / ${a.dependencies.total} total`));
  const unknowns = a.dependencies.items.filter((d) => d.status === 'unknown');
  if (unknowns.length > 0) {
    console.log(
      chalk.dim('  "unknown" means the registry was unreachable — versions are never guessed.'),
    );
  }
}

export function printActivity(a: RepoAnalysis): void {
  printHeader();
  console.log('');
  console.log(chalk.bold('Activity'));
  console.log('');
  const t = new Table({
    head: [chalk.dim('signal'), chalk.dim('value')],
    colWidths: [24, 44],
    style: { head: [], border: [] },
  });
  t.push(
    ['Last push', fmtAgo(a.activity.monthsSincePush, a.metadata.pushedAt)],
    [
      'Commits (30-sample)',
      a.activity.commitCountSample === null ? 'unavailable' : String(a.activity.commitCountSample),
    ],
    [
      'Contributors',
      a.activity.contributorCount === null ? 'unavailable' : String(a.activity.contributorCount),
    ],
    ['Branches', a.activity.branchCount === null ? 'unavailable' : String(a.activity.branchCount)],
    [
      'Releases',
      a.activity.releaseCount === null ? 'unavailable' : String(a.activity.releaseCount),
    ],
    ['Open issues', String(a.metadata.openIssues)],
    ['Open PRs', String(a.metadata.openPrs)],
    ['Archived', a.metadata.archived ? 'yes' : 'no'],
  );
  console.log(t.toString());
  console.log('');
  console.log(chalk.bold('Maintenance assessment: ') + a.maintenance.label);
  for (const e of a.maintenance.evidence) {
    console.log(chalk.dim('  - ' + e));
  }
}

export function printPlan(a: RepoAnalysis): void {
  printHeader();
  console.log('');
  console.log(chalk.bold('REVIVAL PLAN'));
  console.log('');
  const groups: Record<string, typeof a.revivalPlan> = {};
  for (const item of a.revivalPlan) {
    const k = `${item.priority} — ${item.area}`;
    groups[k] = groups[k] ?? [];
    groups[k]?.push(item);
  }
  for (const [group, items] of Object.entries(groups)) {
    console.log(chalk.cyan(group));
    for (const item of items) {
      console.log(`    ${chalk.bold('·')} ${item.title}`);
      console.log(chalk.dim(`      Why: ${item.why}`));
      console.log(chalk.dim(`      Change: ${item.change}`));
      console.log(chalk.dim(`      Risk: ${item.risk} · Effort: ${item.effort}`));
    }
    console.log('');
  }
}
