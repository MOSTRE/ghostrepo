import type { RepoAnalysis } from './types.js';

export interface AbandonmentVerdict {
  status: 'healthy' | 'possibly-abandoned' | 'low-activity' | 'unknown';
  label: string;
  evidence: string[];
}

/**
 * Transparent heuristic — never claims certainty.
 * Wording is deliberately cautious: "possibly abandoned",
 * "low recent maintenance activity", etc.
 */
export function classifyMaintenance(a: {
  archived: boolean;
  monthsSincePush: number | null;
  releaseCount: number | null;
  monthsSinceRelease: number | null;
  openIssues: number | null;
  openPrs: number | null;
  ciFailing: boolean;
  outdatedDeps: number | null;
}): AbandonmentVerdict {
  const evidence: string[] = [];

  if (a.archived) {
    return {
      status: 'possibly-abandoned',
      label: 'Possibly abandoned (archived)',
      evidence: ['Repository is archived on GitHub (read-only).'],
    };
  }

  let points = 0;

  if (a.monthsSincePush === null) {
    evidence.push('Last push date unavailable (API error or rate limit).');
  } else if (a.monthsSincePush >= 18) {
    points += 3;
    evidence.push(`Last push ${a.monthsSincePush.toFixed(1)} months ago.`);
  } else if (a.monthsSincePush >= 9) {
    points += 2;
    evidence.push(`Last push ${a.monthsSincePush.toFixed(1)} months ago.`);
  } else if (a.monthsSincePush >= 4) {
    points += 1;
    evidence.push(`Last push ${a.monthsSincePush.toFixed(1)} months ago (cooling off).`);
  } else {
    evidence.push(`Last push ${a.monthsSincePush.toFixed(1)} months ago (recent).`);
  }

  if (a.releaseCount === 0) {
    points += 1;
    evidence.push('No releases published.');
  } else if (a.monthsSinceRelease !== null && a.monthsSinceRelease >= 18) {
    points += 1;
    evidence.push(`Latest release ${a.monthsSinceRelease.toFixed(1)} months ago.`);
  }

  if ((a.openIssues ?? 0) >= 30) {
    points += 1;
    evidence.push(`${a.openIssues} open issues suggest a maintenance backlog.`);
  }
  if ((a.openPrs ?? 0) >= 5) {
    points += 1;
    evidence.push(`${a.openPrs} open pull requests awaiting review.`);
  }
  if (a.ciFailing) {
    points += 1;
    evidence.push('Most recent CI runs are failing.');
  }
  if ((a.outdatedDeps ?? 0) >= 5) {
    points += 1;
    evidence.push(`${a.outdatedDeps} outdated dependencies detected.`);
  }

  if (a.monthsSincePush === null && a.releaseCount === null) {
    return { status: 'unknown', label: 'Unknown (insufficient data)', evidence };
  }
  if (points >= 4) {
    return { status: 'possibly-abandoned', label: 'Possibly abandoned', evidence };
  }
  if (points >= 2) {
    return { status: 'low-activity', label: 'Low recent maintenance activity', evidence };
  }
  return { status: 'healthy', label: 'Healthy', evidence };
}

export function verdictForAnalysis(a: RepoAnalysis): AbandonmentVerdict {
  return classifyMaintenance({
    archived: a.metadata.archived,
    monthsSincePush: a.activity.monthsSincePush,
    releaseCount: a.activity.releaseCount,
    monthsSinceRelease: a.activity.monthsSinceRelease,
    openIssues: a.metadata.openIssues,
    openPrs: a.metadata.openPrs,
    ciFailing: a.ci.status === 'failing',
    outdatedDeps: a.dependencies.outdated,
  });
}
