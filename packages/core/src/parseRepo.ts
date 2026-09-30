import type { RepoRef } from './types.js';

export type { RepoRef };

const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

function sanitize(segment: string): string {
  // Allow only safe path characters; reject traversal, spaces, control chars.
  if (
    segment.includes('..') ||
    segment.includes('/') ||
    segment.includes('\\') ||
    /[\s<>:"|?*\x00-\x1f]/.test(segment)
  ) {
    throw new Error(`Invalid repository segment: ${JSON.stringify(segment)}`);
  }
  return segment;
}

/**
 * Accept "owner/repo", "https://github.com/owner/repo",
 * "github.com/owner/repo", "owner/repo/" etc.
 * Throws on anything else — never guesses.
 */
export function parseRepo(input: string): RepoRef {
  const trimmed = input.trim().replace(/\/+$/, '');
  if (!trimmed) throw new Error('Empty repository reference. Expected owner/repo.');

  let candidate = trimmed;
  const urlMatch = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+\/[^/]+)(?:\/.*)?$/i,
  );
  if (urlMatch) {
    candidate = (urlMatch[1] as string).replace(/\.git$/, '');
  } else {
    candidate = candidate.replace(/\.git$/, '');
  }

  if (!REPO_RE.test(candidate)) {
    throw new Error(
      `Invalid repository reference ${JSON.stringify(input)}. Expected "owner/repo" or a github.com URL.`,
    );
  }
  const [owner, repo] = candidate.split('/') as [string, string];
  return { owner: sanitize(owner), repo: sanitize(repo) };
}

export function repoSlug(ref: RepoRef): string {
  return `${ref.owner}/${ref.repo}`;
}
