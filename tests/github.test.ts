import { describe, expect, it, vi, afterEach } from 'vitest';
import { GitHubApiError, GitHubClient } from '@ghostrepo/github';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GitHubClient', () => {
  it('maps repo payload to metadata', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          full_name: 'acme/tool',
          owner: { login: 'acme' },
          name: 'tool',
          description: 'x',
          stargazers_count: 5,
          forks_count: 1,
          subscribers_count: 2,
          open_issues_count: 3,
          default_branch: 'main',
          created_at: '2020-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          pushed_at: '2024-01-01T00:00:00Z',
          archived: false,
          disabled: false,
          private: false,
          license: { spdx_id: 'MIT' },
          topics: [],
          language: 'TypeScript',
          homepage: null,
        }),
      })),
    );
    const c = new GitHubClient({});
    const m = await c.getRepo({ owner: 'acme', repo: 'tool' });
    expect(m.fullName).toBe('acme/tool');
    expect(m.stars).toBe(5);
  });

  it('throws typed errors on rate limits and 404s', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 429, headers: new Headers() })),
    );
    const c = new GitHubClient({});
    await expect(c.getRepo({ owner: 'a', repo: 'b' })).rejects.toBeInstanceOf(GitHubApiError);
  });

  it('never sends Authorization without a token', async () => {
    let sent: Record<string, string> = {};
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: { headers?: Record<string, string> }) => {
        sent = init?.headers ?? {};
        return { ok: true, status: 200, headers: new Headers(), json: async () => ({}) };
      }),
    );
    const c = new GitHubClient({});
    expect(c.hasAuth()).toBe(false);
    await c.request('/x');
    expect(sent['Authorization']).toBeUndefined();
  });
});
