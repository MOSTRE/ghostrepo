import ora from 'ora';
import { analyzeRepository, loadConfig, parseRepo, type RepoAnalysis } from '@ghostrepo/core';

export interface RunOptions {
  token?: string;
  withLatest?: boolean;
  json?: boolean;
}

/** Shared scan wiring: parse input, load config, run analysis with a spinner. */
export async function runScan(input: string, opts: RunOptions = {}): Promise<RepoAnalysis> {
  const ref = parseRepo(input);
  const config = loadConfig();
  const spinner = opts.json ? null : ora(`Scanning ${ref.owner}/${ref.repo}…`).start();
  try {
    const analysis = await analyzeRepository(ref, {
      token: opts.token ?? config.githubToken,
      includeLatest: opts.withLatest ?? true,
      offline: config.offline,
    });
    spinner?.succeed(`Scanned ${ref.owner}/${ref.repo}`);
    return analysis;
  } catch (err) {
    spinner?.fail('Scan failed');
    throw err;
  }
}
