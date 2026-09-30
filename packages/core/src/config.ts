import type { ScoreWeights } from '@ghostrepo/scoring';
import { DEFAULT_WEIGHTS } from '@ghostrepo/scoring';

export interface GhostRepoConfig {
  weights: ScoreWeights;
  githubToken?: string;
  offline: boolean;
}

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Weights are configurable through GHOSTREPO_WEIGHT_* env vars. */
export function loadConfig(): GhostRepoConfig {
  const weights: ScoreWeights = {
    maintenance: num('GHOSTREPO_WEIGHT_MAINTENANCE', DEFAULT_WEIGHTS.maintenance),
    activity: num('GHOSTREPO_WEIGHT_ACTIVITY', DEFAULT_WEIGHTS.activity),
    dependencies: num('GHOSTREPO_WEIGHT_DEPENDENCIES', DEFAULT_WEIGHTS.dependencies),
    ci: num('GHOSTREPO_WEIGHT_CI', DEFAULT_WEIGHTS.ci),
    documentation: num('GHOSTREPO_WEIGHT_DOCUMENTATION', DEFAULT_WEIGHTS.documentation),
    tests: num('GHOSTREPO_WEIGHT_TESTS', DEFAULT_WEIGHTS.tests),
    issues: num('GHOSTREPO_WEIGHT_ISSUES', DEFAULT_WEIGHTS.issues),
    releases: num('GHOSTREPO_WEIGHT_RELEASES', DEFAULT_WEIGHTS.releases),
  };
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  // Guard against a zeroed-out config: fall back to defaults.
  const safe = sum > 0 ? weights : { ...DEFAULT_WEIGHTS };
  return {
    weights: safe,
    githubToken: process.env['GHOSTREPO_GITHUB_TOKEN'] ?? process.env['GITHUB_TOKEN'] ?? undefined,
    offline: process.env['GHOSTREPO_OFFLINE'] === '1',
  };
}
