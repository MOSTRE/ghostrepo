export interface ScoreWeights {
  maintenance: number;
  activity: number;
  dependencies: number;
  ci: number;
  documentation: number;
  tests: number;
  issues: number;
  releases: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  maintenance: 25,
  activity: 20,
  dependencies: 15,
  ci: 15,
  documentation: 10,
  tests: 5,
  issues: 5,
  releases: 5,
};

export interface ScoreInputs {
  archived: boolean;
  monthsSincePush: number | null;
  commitCount90d: number | null;
  contributorCount: number | null;
  outdatedDeps: number | null;
  totalDeps: number | null;
  ciStatus: 'passing' | 'failing' | 'unknown' | 'none';
  hasReadme: boolean;
  readmeLength: number | null;
  hasLicense: boolean;
  hasTests: boolean;
  openIssues: number | null;
  openPrs: number | null;
  releaseCount: number | null;
  monthsSinceRelease: number | null;
  unavailable: string[];
}

export interface CategoryScore {
  key: keyof ScoreWeights;
  label: string;
  earned: number;
  max: number;
  detail: string;
}

export interface GhostScore {
  total: number;
  max: number;
  categories: CategoryScore[];
  unavailable: string[];
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function monthsBonus(months: number | null): number {
  if (months === null) return 0;
  if (months <= 1) return 1;
  if (months <= 3) return 0.8;
  if (months <= 6) return 0.6;
  if (months <= 12) return 0.35;
  if (months <= 24) return 0.15;
  return 0;
}

/**
 * Transparent health score. Every category documents exactly
 * how points are earned — see docs/scoring.md for the formula.
 * Missing data earns 0 for that slice and is listed under `unavailable`
 * instead of being silently treated as healthy.
 */
export function computeScore(
  inputs: ScoreInputs,
  weights: ScoreWeights = DEFAULT_WEIGHTS,
): GhostScore {
  const cats: CategoryScore[] = [];

  // Maintenance (archived, recency)
  {
    const max = weights.maintenance;
    let earned = 0;
    let detail: string;
    if (inputs.archived) {
      earned = 0;
      detail = 'repository is archived';
    } else if (inputs.monthsSincePush === null) {
      earned = 0;
      detail = 'last push date unavailable';
    } else {
      earned = Math.round(max * monthsBonus(inputs.monthsSincePush));
      detail = `last push ${inputs.monthsSincePush.toFixed(1)} months ago`;
    }
    cats.push({ key: 'maintenance', label: 'Maintenance', earned, max, detail });
  }

  // Recent activity (commits + contributors in window)
  {
    const max = weights.activity;
    let earned = 0;
    let detail = '';
    if (inputs.commitCount90d === null) {
      detail = 'commit history unavailable';
    } else {
      const commitPts = clamp(inputs.commitCount90d / 20, 0, 1) * 0.7;
      const contribPts =
        inputs.contributorCount === null ? 0 : clamp(inputs.contributorCount / 5, 0, 1) * 0.3;
      earned = Math.round(max * clamp(commitPts + contribPts, 0, 1));
      detail = `${inputs.commitCount90d} commits in latest-30 sample, ${inputs.contributorCount ?? '?'} contributors`;
    }
    cats.push({ key: 'activity', label: 'Recent activity', earned, max, detail });
  }

  // Dependencies
  {
    const max = weights.dependencies;
    let earned = 0;
    let detail = '';
    if (inputs.totalDeps === null || inputs.outdatedDeps === null) {
      detail = 'dependency data unavailable';
    } else if (inputs.totalDeps === 0) {
      earned = max;
      detail = 'no manifest dependencies found';
    } else {
      const fresh = (inputs.totalDeps - inputs.outdatedDeps) / inputs.totalDeps;
      earned = Math.round(max * clamp(fresh, 0, 1));
      detail = `${inputs.outdatedDeps}/${inputs.totalDeps} outdated`;
    }
    cats.push({ key: 'dependencies', label: 'Dependencies', earned, max, detail });
  }

  // CI health
  {
    const max = weights.ci;
    let earned = 0;
    let detail = '';
    switch (inputs.ciStatus) {
      case 'passing':
        earned = max;
        detail = 'recent workflow runs passing';
        break;
      case 'failing':
        earned = Math.round(max * 0.25);
        detail = 'recent workflow runs failing';
        break;
      case 'none':
        earned = Math.round(max * 0.4);
        detail = 'no CI configuration detected';
        break;
      default:
        earned = 0;
        detail = 'CI status unavailable';
    }
    cats.push({ key: 'ci', label: 'CI health', earned, max, detail });
  }

  // Documentation
  {
    const max = weights.documentation;
    let earned = 0;
    const parts: string[] = [];
    if (inputs.hasReadme) {
      const len = inputs.readmeLength ?? 0;
      earned += Math.round(max * 0.7 * (len > 2000 ? 1 : len > 500 ? 0.7 : 0.4));
      parts.push('README present');
    } else {
      parts.push('README missing');
    }
    if (inputs.hasLicense) {
      earned += Math.round(max * 0.3);
      parts.push('LICENSE present');
    } else {
      parts.push('LICENSE missing');
    }
    earned = clamp(earned, 0, max);
    cats.push({
      key: 'documentation',
      label: 'Documentation',
      earned,
      max,
      detail: parts.join(', '),
    });
  }

  // Tests
  {
    const max = weights.tests;
    const earned = inputs.hasTests ? max : 0;
    cats.push({
      key: 'tests',
      label: 'Tests',
      earned,
      max,
      detail: inputs.hasTests ? 'test files or config detected' : 'no tests detected',
    });
  }

  // Issues / PRs — backlog pressure. Fewer open items relative to activity is healthier.
  {
    const max = weights.issues;
    let earned = 0;
    let detail = '';
    if (inputs.openIssues === null || inputs.openPrs === null) {
      detail = 'issue/PR data unavailable';
    } else {
      const backlog = inputs.openIssues + inputs.openPrs * 2;
      const ratio = clamp(backlog / 50, 0, 1);
      earned = Math.round(max * (1 - ratio));
      detail = `${inputs.openIssues} open issues, ${inputs.openPrs} open PRs`;
    }
    cats.push({ key: 'issues', label: 'Issues/PRs', earned, max, detail });
  }

  // Releases
  {
    const max = weights.releases;
    let earned = 0;
    let detail = '';
    if (inputs.releaseCount === null) {
      detail = 'release data unavailable';
    } else if (inputs.releaseCount === 0) {
      earned = 0;
      detail = 'no releases published';
    } else {
      const recency = monthsBonus(inputs.monthsSinceRelease);
      earned = Math.round(max * (0.5 + 0.5 * recency));
      detail = `${inputs.releaseCount} releases${inputs.monthsSinceRelease !== null ? `, latest ${inputs.monthsSinceRelease.toFixed(1)}mo ago` : ''}`;
    }
    cats.push({ key: 'releases', label: 'Releases', earned, max, detail });
  }

  const total = cats.reduce((a, c) => a + c.earned, 0);
  const max = cats.reduce((a, c) => a + c.max, 0);
  return { total, max, categories: cats, unavailable: inputs.unavailable };
}

export function effortForScore(total: number): 'Low' | 'Medium' | 'High' {
  if (total >= 75) return 'Low';
  if (total >= 45) return 'Medium';
  return 'High';
}
