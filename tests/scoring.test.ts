import { describe, expect, it } from 'vitest';
import { computeScore, DEFAULT_WEIGHTS } from '@ghostrepo/scoring';

function base() {
  return {
    archived: false,
    monthsSincePush: 0.5,
    commitCount90d: 25,
    contributorCount: 6,
    outdatedDeps: 0,
    totalDeps: 10,
    ciStatus: 'passing' as const,
    hasReadme: true,
    readmeLength: 3000,
    hasLicense: true,
    hasTests: true,
    openIssues: 2,
    openPrs: 0,
    releaseCount: 3,
    monthsSinceRelease: 1,
    unavailable: [] as string[],
  };
}

describe('computeScore', () => {
  it('weights sum to 100 by default', () => {
    const sum = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });

  it('scores a healthy repo highly', () => {
    const s = computeScore(base());
    expect(s.total).toBeGreaterThan(80);
    expect(s.max).toBe(100);
  });

  it('penalizes archived and stale repos', () => {
    const archived = computeScore({ ...base(), archived: true });
    // Archived zeroes the 25-point maintenance slice: 100 -> 75.
    expect(archived.total).toBeLessThanOrEqual(75);
    const stale = computeScore({
      ...base(),
      monthsSincePush: 30,
      commitCount90d: 0,
      contributorCount: 1,
      outdatedDeps: 9,
      ciStatus: 'failing',
      releaseCount: 0,
      monthsSinceRelease: null,
      openIssues: 60,
      openPrs: 10,
    });
    expect(stale.total).toBeLessThan(45);
  });

  it('treats missing data as zero, not healthy', () => {
    const s = computeScore({
      ...base(),
      monthsSincePush: null,
      commitCount90d: null,
      outdatedDeps: null,
      totalDeps: null,
    });
    const maint = s.categories.find((c) => c.key === 'maintenance');
    expect(maint?.earned).toBe(0);
  });

  it('totals equal the sum of categories', () => {
    const s = computeScore(base());
    expect(s.total).toBe(s.categories.reduce((a, c) => a + c.earned, 0));
    expect(s.max).toBe(s.categories.reduce((a, c) => a + c.max, 0));
  });
});
