import type { Ecosystem } from './manifests.js';

const cache = new Map<string, string | null>();

async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'ghostrepo/0.1.0' },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Look up the real "latest" version for a package.
 * Returns null when offline or unreachable — callers must
 * display "unknown" rather than fabricate a version.
 */
export async function latestVersion(ecosystem: Ecosystem, name: string): Promise<string | null> {
  if (process.env['GHOSTREPO_OFFLINE'] === '1') return null;
  const key = `${ecosystem}:${name}`;
  if (cache.has(key)) return cache.get(key) ?? null;

  let latest: string | null = null;
  try {
    if (ecosystem === 'npm') {
      const data = (await fetchJson(
        `https://registry.npmjs.org/${encodeURIComponent(name)}/latest`,
      )) as { version?: string } | null;
      latest = typeof data?.version === 'string' ? data.version : null;
    } else if (ecosystem === 'pip' || ecosystem === 'poetry' || ecosystem === 'uv') {
      const data = (await fetchJson(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`)) as {
        info?: { version?: string };
      } | null;
      latest = typeof data?.info?.version === 'string' ? data.info.version : null;
    } else if (ecosystem === 'cargo') {
      const data = (await fetchJson(
        `https://crates.io/api/v1/crates/${encodeURIComponent(name)}`,
      )) as {
        crate?: { newest_version?: string };
      } | null;
      latest = typeof data?.crate?.newest_version === 'string' ? data.crate.newest_version : null;
    }
    // go, maven, gradle, composer, bundler: no unauthenticated "latest" lookup yet.
    // Return null so the report says "unknown" honestly.
  } catch {
    latest = null;
  }
  cache.set(key, latest);
  return latest;
}
