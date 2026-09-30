import type { RepoAnalysis } from '@ghostrepo/core';

export function toJsonReport(analysis: RepoAnalysis): string {
  return JSON.stringify(analysis, null, 2) + '\n';
}
