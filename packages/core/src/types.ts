import type { DependencyStatus, ManifestFile } from '@ghostrepo/dependencies';
import type { GhostScore } from '@ghostrepo/scoring';

export interface RepoRef {
  owner: string;
  repo: string;
}

export type CiStatus = 'passing' | 'failing' | 'unknown' | 'none';

export interface HealthSignal {
  key: string;
  label: string;
  value: string;
  status: 'ok' | 'warn' | 'bad' | 'unknown';
  evidence: string;
}

export interface RevivalAction {
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  area: string;
  title: string;
  why: string;
  current: string;
  change: string;
  risk: string;
  effort: 'Small' | 'Medium' | 'Large';
}

export interface RepoAnalysis {
  repo: string;
  fetchedAt: string;
  metadata: {
    description: string | null;
    stars: number;
    forks: number;
    watchers: number;
    openIssues: number;
    openPrs: number;
    createdAt: string;
    pushedAt: string;
    defaultBranch: string;
    archived: boolean;
    license: string | null;
    language: string | null;
    topics: string[];
  };
  activity: {
    monthsSincePush: number | null;
    commitCountSample: number | null;
    contributorCount: number | null;
    releaseCount: number | null;
    monthsSinceRelease: number | null;
    branchCount: number | null;
  };
  files: {
    readme: boolean;
    license: boolean;
    ci: boolean;
    docker: boolean;
    tests: boolean;
    envExample: boolean;
    manifests: ManifestFile[];
  };
  ci: { status: CiStatus; detail: string };
  documentation: { status: 'good' | 'needs-attention' | 'missing'; detail: string };
  dependencies: {
    total: number;
    outdated: number;
    unknown: number;
    items: DependencyStatus[];
    unavailable: string[];
  };
  score: GhostScore;
  maintenance: {
    status: 'healthy' | 'possibly-abandoned' | 'low-activity' | 'unknown';
    label: string;
    evidence: string[];
  };
  revivalPlan: RevivalAction[];
  unavailable: string[];
  rateLimited: boolean;
}
