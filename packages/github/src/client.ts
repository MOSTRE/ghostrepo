/* eslint-disable @typescript-eslint/no-explicit-any -- GitHub REST payloads are dynamic JSON; they are mapped to typed metadata at the boundary in each method. */
import { GitHubApiError, type RepoMetadata, type RepoRef } from './types.js';

const API_BASE = 'https://api.github.com';

export interface GitHubClientOptions {
  token?: string;
  userAgent?: string;
  timeoutMs?: number;
}

export interface RequestResult {
  rateLimited: boolean;
  rateLimitRemaining: number | null;
}

function resolveToken(explicit?: string): string | undefined {
  if (explicit) return explicit;
  const env =
    process.env['GHOSTREPO_GITHUB_TOKEN'] ?? process.env['GITHUB_TOKEN'] ?? process.env['GH_TOKEN'];
  return env && env.length > 0 ? env : undefined;
}

/**
 * Thin wrapper around the GitHub REST API.
 *
 * Uses global fetch so there are no extra runtime dependencies.
 * Never logs tokens. All failures surface as typed errors so callers
 * can report "unavailable" instead of inventing data.
 */
export class GitHubClient {
  private token: string | undefined;
  private userAgent: string;
  private timeoutMs: number;
  lastRateLimitRemaining: number | null = null;

  constructor(opts: GitHubClientOptions = {}) {
    this.token = resolveToken(opts.token);
    this.userAgent = opts.userAgent ?? 'ghostrepo/0.1.0';
    this.timeoutMs = opts.timeoutMs ?? 15000;
  }

  hasAuth(): boolean {
    return Boolean(this.token);
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': this.userAgent,
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  }

  async request<T>(path: string): Promise<T> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        headers: this.headers(),
        signal: ctrl.signal,
      });
      const remaining = res.headers.get('x-ratelimit-remaining');
      this.lastRateLimitRemaining = remaining ? Number(remaining) : null;
      if (res.status === 403 || res.status === 429) {
        throw new GitHubApiError(
          'GitHub API rate limit reached. Set GHOSTREPO_GITHUB_TOKEN to raise limits.',
          res.status,
        );
      }
      if (res.status === 404) {
        throw new GitHubApiError('Not found: ' + path, 404);
      }
      if (!res.ok) {
        throw new GitHubApiError(`GitHub API error ${res.status} for ${path}`, res.status);
      }
      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof GitHubApiError) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new GitHubApiError('GitHub API request timed out', 408);
      }
      throw new GitHubApiError(
        `Network error contacting GitHub API: ${err instanceof Error ? err.message : String(err)}`,
        0,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  async getRepo(ref: RepoRef): Promise<RepoMetadata> {
    const data = await this.request<any>(`/repos/${ref.owner}/${ref.repo}`);
    return {
      fullName: data.full_name,
      owner: data.owner?.login ?? ref.owner,
      name: data.name ?? ref.repo,
      description: data.description ?? null,
      stars: data.stargazers_count ?? 0,
      forks: data.forks_count ?? 0,
      watchers: data.subscribers_count ?? data.watchers_count ?? 0,
      openIssues: data.open_issues_count ?? 0,
      defaultBranch: data.default_branch ?? 'main',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      pushedAt: data.pushed_at,
      archived: Boolean(data.archived),
      disabled: Boolean(data.disabled),
      private: Boolean(data.private),
      license: data.license?.spdx_id ?? data.license?.name ?? null,
      topics: Array.isArray(data.topics) ? data.topics : [],
      language: data.language ?? null,
      homepage: data.homepage ?? null,
    };
  }

  async listCommits(ref: RepoRef, perPage = 30): Promise<any[]> {
    return this.request<any[]>(`/repos/${ref.owner}/${ref.repo}/commits?per_page=${perPage}`);
  }

  async listIssues(ref: RepoRef, perPage = 30): Promise<any[]> {
    return this.request<any[]>(
      `/repos/${ref.owner}/${ref.repo}/issues?state=open&per_page=${perPage}`,
    );
  }

  async listPulls(ref: RepoRef, perPage = 30): Promise<any[]> {
    return this.request<any[]>(
      `/repos/${ref.owner}/${ref.repo}/pulls?state=open&per_page=${perPage}`,
    );
  }

  async listReleases(ref: RepoRef): Promise<any[]> {
    return this.request<any[]>(`/repos/${ref.owner}/${ref.repo}/releases?per_page=10`);
  }

  async listBranches(ref: RepoRef): Promise<any[]> {
    return this.request<any[]>(`/repos/${ref.owner}/${ref.repo}/branches?per_page=100`);
  }

  async listContributors(ref: RepoRef): Promise<any[]> {
    return this.request<any[]>(`/repos/${ref.owner}/${ref.repo}/contributors?per_page=100`);
  }

  async getLanguages(ref: RepoRef): Promise<Record<string, number>> {
    return this.request<Record<string, number>>(`/repos/${ref.owner}/${ref.repo}/languages`);
  }

  async getContents(ref: RepoRef, path: string, branch?: string): Promise<any> {
    const q = branch ? `?ref=${encodeURIComponent(branch)}` : '';
    return this.request<any>(
      `/repos/${ref.owner}/${ref.repo}/contents/${encodeURIComponent(path)}${q}`,
    );
  }

  async fileExists(ref: RepoRef, path: string, branch?: string): Promise<boolean> {
    try {
      await this.getContents(ref, path, branch);
      return true;
    } catch (err) {
      if (err instanceof GitHubApiError && err.status === 404) return false;
      throw err;
    }
  }

  async getFileText(ref: RepoRef, path: string, branch?: string): Promise<string | null> {
    try {
      const data: any = await this.getContents(ref, path, branch);
      if (data && data.content && data.encoding === 'base64') {
        return Buffer.from(data.content, 'base64').toString('utf8');
      }
      return null;
    } catch (err) {
      if (err instanceof GitHubApiError && err.status === 404) return null;
      throw err;
    }
  }

  async getWorkflowRuns(ref: RepoRef): Promise<any[] | null> {
    try {
      const data = await this.request<any>(
        `/repos/${ref.owner}/${ref.repo}/actions/runs?per_page=10`,
      );
      return data.workflow_runs ?? [];
    } catch (err) {
      if (err instanceof GitHubApiError && (err.status === 404 || err.status === 403)) return null;
      throw err;
    }
  }
}
