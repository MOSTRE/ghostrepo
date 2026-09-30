import { describe, expect, it } from 'vitest';
import { classifyMaintenance } from '@ghostrepo/core';

describe('classifyMaintenance', () => {
  it('flags archived repos as possibly abandoned', () => {
    const v = classifyMaintenance({
      archived: true,
      monthsSincePush: 1,
      releaseCount: 5,
      monthsSinceRelease: 1,
      openIssues: 0,
      openPrs: 0,
      ciFailing: false,
      outdatedDeps: 0,
    });
    expect(v.status).toBe('possibly-abandoned');
    expect(v.label.toLowerCase()).toContain('archiv');
  });

  it('flags long-inactive repos with backlog', () => {
    const v = classifyMaintenance({
      archived: false,
      monthsSincePush: 26,
      releaseCount: 0,
      monthsSinceRelease: null,
      openIssues: 47,
      openPrs: 9,
      ciFailing: true,
      outdatedDeps: 8,
    });
    expect(v.status).toBe('possibly-abandoned');
    expect(v.evidence.length).toBeGreaterThan(2);
  });

  it('calls recent repos healthy', () => {
    const v = classifyMaintenance({
      archived: false,
      monthsSincePush: 0.5,
      releaseCount: 4,
      monthsSinceRelease: 1,
      openIssues: 3,
      openPrs: 1,
      ciFailing: false,
      outdatedDeps: 1,
    });
    expect(v.status).toBe('healthy');
  });

  it('never claims certainty', () => {
    const v = classifyMaintenance({
      archived: false,
      monthsSincePush: 40,
      releaseCount: 0,
      monthsSinceRelease: null,
      openIssues: 100,
      openPrs: 20,
      ciFailing: true,
      outdatedDeps: 20,
    });
    expect(v.label.toLowerCase()).not.toContain('dead');
    expect(v.label.toLowerCase()).toMatch(/possibly|low|inactive|abandoned/);
  });
});
