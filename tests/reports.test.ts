import { describe, expect, it } from 'vitest';
import { toJsonReport, toMarkdownReport, toHtmlReport } from '@ghostrepo/reports';
import { buildRevivalPlan, type RepoAnalysis } from '@ghostrepo/core';
import { computeScore } from '@ghostrepo/scoring';

function sample(): RepoAnalysis {
  const score = computeScore({
    archived: false,
    monthsSincePush: 14,
    commitCount90d: 1,
    contributorCount: 1,
    outdatedDeps: 6,
    totalDeps: 10,
    ciStatus: 'failing',
    hasReadme: true,
    readmeLength: 400,
    hasLicense: false,
    hasTests: false,
    openIssues: 37,
    openPrs: 4,
    releaseCount: 0,
    monthsSinceRelease: null,
    unavailable: [],
  });
  const a: RepoAnalysis = {
    repo: 'someone/abandoned-widget',
    fetchedAt: '2026-01-01T00:00:00.000Z',
    metadata: {
      description: 'Widgets',
      stars: 340,
      forks: 90,
      watchers: 12,
      openIssues: 37,
      openPrs: 4,
      createdAt: '2016-04-02T00:00:00Z',
      pushedAt: '2024-11-01T00:00:00Z',
      defaultBranch: 'master',
      archived: false,
      license: null,
      language: 'JavaScript',
      topics: [],
    },
    activity: {
      monthsSincePush: 14,
      commitCountSample: 1,
      contributorCount: 1,
      releaseCount: 0,
      monthsSinceRelease: null,
      branchCount: 14,
    },
    files: {
      readme: true,
      license: false,
      ci: true,
      docker: false,
      tests: false,
      envExample: false,
      manifests: [{ ecosystem: 'npm', path: 'package.json', manager: 'npm' }],
    },
    ci: { status: 'failing', detail: 'Latest workflow run: failure' },
    documentation: { status: 'needs-attention', detail: 'README present (400 chars)' },
    dependencies: {
      total: 10,
      outdated: 6,
      unknown: 0,
      items: [
        {
          name: 'react',
          current: '17.0.2',
          ecosystem: 'npm',
          dev: false,
          latest: '19.0.0',
          status: 'outdated',
        },
      ],
      unavailable: [],
    },
    score,
    maintenance: {
      status: 'possibly-abandoned',
      label: 'Possibly abandoned',
      evidence: ['Last push 14.0 months ago.'],
    },
    revivalPlan: [],
    unavailable: [],
    rateLimited: false,
  };
  a.revivalPlan = buildRevivalPlan(a);
  return a;
}

describe('reports', () => {
  it('produces valid JSON', () => {
    const a = sample();
    expect(JSON.parse(toJsonReport(a)).repo).toBe('someone/abandoned-widget');
  });

  it('markdown includes score, evidence and plan', () => {
    const md = toMarkdownReport(sample());
    expect(md).toContain('GhostRepo Report');
    expect(md).toContain('Revival plan');
    expect(md).toContain('Score breakdown');
  });

  it('html escapes content', () => {
    const a = sample();
    a.metadata.description = '<script>alert(1)</script>';
    const html = toHtmlReport(a);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('config', () => {
  it('loads default weights from env', async () => {
    const { loadConfig } = await import('@ghostrepo/core');
    const c = loadConfig();
    const sum = Object.values(c.weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThan(0);
  });
});
