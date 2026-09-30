import type { RepoAnalysis, RevivalAction } from './types.js';

/**
 * Build a prioritized modernization plan from observed facts.
 * Each item explains why it matters, what's outdated, what should
 * change, the risk, and the effort. No invented versions.
 */
export function buildRevivalPlan(a: RepoAnalysis): RevivalAction[] {
  const plan: RevivalAction[] = [];

  const outdated = a.dependencies.items.filter(
    (d) => d.status === 'outdated' || d.status === 'update-available',
  );

  if (outdated.length > 0) {
    const names = outdated
      .slice(0, 6)
      .map((d) => `${d.name}@${d.current}`)
      .join(', ');
    plan.push({
      priority: 'P0',
      area: 'Security',
      title: `Upgrade ${outdated.length} outdated dependenc${outdated.length === 1 ? 'y' : 'ies'} (${names}${outdated.length > 6 ? ', …' : ''})`,
      why: 'Old dependencies are the most common way abandoned projects become unusable or unsafe.',
      current: `${a.dependencies.outdated} marked outdated, ${a.dependencies.unknown} with unknown latest.`,
      change: 'Update one dependency at a time, starting with majors behind. Run tests after each.',
      risk: 'Major bumps can break APIs. Pin versions and review changelogs before merging.',
      effort: outdated.length > 10 ? 'Large' : outdated.length > 4 ? 'Medium' : 'Small',
    });
  }

  if (a.ci.status === 'failing') {
    plan.push({
      priority: 'P1',
      area: 'Build',
      title: 'Fix failing CI',
      why: 'Nobody contributes to a repo with a red build. CI is the front door.',
      current: a.ci.detail,
      change: 'Reproduce the failing job locally, pin the runtime version, fix, then re-run.',
      risk: 'Low. CI changes do not affect shipped code.',
      effort: 'Medium',
    });
  } else if (a.ci.status === 'none') {
    plan.push({
      priority: 'P1',
      area: 'Build',
      title: 'Add a minimal CI workflow',
      why: 'Without CI every revival PR is verified by hand, which does not scale.',
      current: 'No CI configuration detected.',
      change: 'Add a small workflow: install, lint, test on the default branch.',
      risk: 'Low.',
      effort: 'Small',
    });
  }

  if (!a.files.tests) {
    plan.push({
      priority: 'P1',
      area: 'Build',
      title: 'Add a smoke test',
      why: 'Revival work without tests is guesswork. One smoke test beats zero tests.',
      current: 'No test files or test config detected.',
      change: 'Add one test that exercises the main entry point, wired into CI.',
      risk: 'Low.',
      effort: 'Small',
    });
  }

  if (a.documentation.status !== 'good') {
    plan.push({
      priority: a.documentation.status === 'missing' ? 'P1' : 'P2',
      area: 'Developer experience',
      title: 'Refresh installation instructions',
      why: 'Stale READMEs are the top reason people bounce from old repos.',
      current: a.documentation.detail,
      change: 'Verify install steps from scratch, document the runtime version, add a quickstart.',
      risk: 'None. Docs-only change.',
      effort: 'Small',
    });
  }

  if (!a.files.license) {
    plan.push({
      priority: 'P2',
      area: 'Maintenance',
      title: 'Add a license',
      why: 'Unlicensed code keeps companies and contributors away.',
      current: 'No LICENSE file detected.',
      change: 'Pick a license (MIT is the common default) and commit a LICENSE file.',
      risk: 'Confirm with the original author when reviving someone else’s project.',
      effort: 'Small',
    });
  }

  if ((a.metadata.openIssues ?? 0) >= 10 || (a.metadata.openPrs ?? 0) >= 3) {
    plan.push({
      priority: 'P2',
      area: 'Maintenance',
      title: 'Triage the issue and PR backlog',
      why: 'A visible backlog signals neglect even when the code is fine.',
      current: `${a.metadata.openIssues} open issues, ${a.metadata.openPrs} open PRs.`,
      change: 'Close duplicates and wontfix, label good-first-issues, merge or close stale PRs.',
      risk: 'Low. Communicate before closing other people’s PRs.',
      effort: 'Medium',
    });
  }

  if (a.activity.branchCount !== null && a.activity.branchCount > 10) {
    plan.push({
      priority: 'P3',
      area: 'Maintenance',
      title: `Clean up ${a.activity.branchCount} stale branches`,
      why: 'Dozens of stale branches confuse newcomers about what is current.',
      current: `${a.activity.branchCount} branches on the remote.`,
      change: 'Delete merged branches, archive experimental ones with a tag first.',
      risk: 'Low if merged branches only. Tag anything uncertain before deleting.',
      effort: 'Small',
    });
  }

  plan.push({
    priority: 'P3',
    area: 'Maintenance',
    title: 'Enable automated dependency updates',
    why: 'Prevents the repo from silently rotting again after revival.',
    current: 'No automated update signal detected.',
    change: 'Enable Dependabot or Renovate with a weekly schedule.',
    risk: 'None. Produces PRs for human review; merges nothing by itself.',
    effort: 'Small',
  });

  const order = { P0: 0, P1: 1, P2: 2, P3: 3 };
  return plan.sort((x, y) => order[x.priority] - order[y.priority]);
}
