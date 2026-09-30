import { analyzeRepository, parseRepo, type RepoAnalysis } from '@ghostrepo/core';

export async function getAnalysis(owner: string, repo: string): Promise<RepoAnalysis> {
  const ref = parseRepo(`${owner}/${repo}`);
  return analyzeRepository(ref, { token: process.env['GHOSTREPO_GITHUB_TOKEN'] });
}
