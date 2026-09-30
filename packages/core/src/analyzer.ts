import {
  classifyDependency,
  detectManifests,
  latestVersion,
  parseCargoToml,
  parseGoMod,
  parsePackageJson,
  parseRequirementsTxt,
  type DependencyStatus,
  type ParsedDependency,
} from '@ghostrepo/dependencies';
import { GitHubApiError, GitHubClient } from '@ghostrepo/github';
import { computeScore, type ScoreInputs } from '@ghostrepo/scoring';
import { classifyMaintenance } from './abandonment.js';
import { buildRevivalPlan } from './revival.js';
import { repoSlug, type RepoRef } from './parseRepo.js';
import type { CiStatus, RepoAnalysis } from './types.js';

export interface AnalyzeOptions {
  token?: string;
  includeLatest?: boolean;
  offline?: boolean;
}

const CHECK_FILES = [
  'README.md',
  'README',
  'readme.md',
  'Readme.md',
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
  'Dockerfile',
  'docker-compose.yml',
  '.env.example',
  'package.json',
  'requirements.txt',
  'pyproject.toml',
  'Cargo.toml',
  'go.mod',
];

function monthsBetween(a: Date, b: Date): number {
  return Math.max(0, (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
}

function tryParseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Parse a manifest body into deps without executing anything. Treated as untrusted text. */
function parseManifestBody(path: string, text: string): ParsedDependency[] {
  const lower = path.toLowerCase();
  if (lower === 'package.json') return parsePackageJson(text);
  if (lower === 'requirements.txt') return parseRequirementsTxt(text);
  if (lower === 'cargo.toml') return parseCargoToml(text);
  if (lower === 'go.mod') return parseGoMod(text);
  return [];
}

export async function analyzeRepository(
  ref: RepoRef,
  opts: AnalyzeOptions = {},
): Promise<RepoAnalysis> {
  const slug = repoSlug(ref);
  const fetchedAt = new Date().toISOString();
  const unavailable: string[] = [];
  let rateLimited = false;

  const client = new GitHubClient({ token: opts.token });
  const offline = opts.offline ?? process.env['GHOSTREPO_OFFLINE'] === '1';

  // --- repo metadata ---
  const meta = await client.getRepo({ owner: ref.owner, repo: ref.repo });

  const now = new Date();
  const pushed = tryParseDate(meta.pushedAt);
  const monthsSincePush = pushed ? monthsBetween(pushed, now) : null;

  // Helper that converts API failures into "unavailable" notes instead of crashing.
  async function safe<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof GitHubApiError && err.rateLimited) rateLimited = true;
      unavailable.push(label);
      return null;
    }
  }

  const [commits, issues, pulls, releases, branches, contributors, languages, runs] =
    await Promise.all([
      safe('commits', () => client.listCommits({ owner: ref.owner, repo: ref.repo }, 30)),
      safe('issues', () => client.listIssues({ owner: ref.owner, repo: ref.repo }, 30)),
      safe('pulls', () => client.listPulls({ owner: ref.owner, repo: ref.repo }, 30)),
      safe('releases', () => client.listReleases({ owner: ref.owner, repo: ref.repo })),
      safe('branches', () => client.listBranches({ owner: ref.owner, repo: ref.repo })),
      safe('contributors', () => client.listContributors({ owner: ref.owner, repo: ref.repo })),
      safe('languages', () => client.getLanguages({ owner: ref.owner, repo: ref.repo })),
      safe('ci-runs', () => client.getWorkflowRuns({ owner: ref.owner, repo: ref.repo })),
    ]);

  // --- file presence checks (each independent, failures are non-fatal) ---
  const presence = new Map<string, boolean>();
  await Promise.all(
    CHECK_FILES.map(async (f) => {
      const exists = await safe(`file:${f}`, () =>
        client.fileExists({ owner: ref.owner, repo: ref.repo }, f, meta.defaultBranch),
      );
      presence.set(f, exists === true);
    }),
  );
  const has = (...names: string[]) => names.some((n) => presence.get(n) === true);

  const hasReadme = has('README.md', 'README', 'readme.md', 'Readme.md');
  const hasLicense = has('LICENSE', 'LICENSE.md', 'LICENSE.txt') || Boolean(meta.license);
  const hasDocker = has('Dockerfile', 'docker-compose.yml');
  const hasEnvExample = has('.env.example');

  // CI: workflow files + recent runs
  const [wfDir, actionsYml] = await Promise.all([
    safe('file:.github/workflows', () =>
      client.fileExists(
        { owner: ref.owner, repo: ref.repo },
        '.github/workflows',
        meta.defaultBranch,
      ),
    ),
    safe('file:ci-config', () =>
      client.fileExists(
        { owner: ref.owner, repo: ref.repo },
        '.github/workflows',
        meta.defaultBranch,
      ),
    ),
  ]);
  void actionsYml;
  const hasCiConfig = wfDir === true;

  let ciStatus: CiStatus = 'unknown';
  let ciDetail = 'CI status unavailable';
  if (runs === null) {
    if (hasCiConfig) {
      ciStatus = 'unknown';
      ciDetail = 'CI configured but run history unavailable (permissions or rate limit)';
    } else {
      ciStatus = 'none';
      ciDetail = 'No CI configuration detected';
    }
    if (!unavailable.includes('ci-runs')) unavailable.push('ci-runs');
  } else if (runs.length === 0) {
    ciStatus = hasCiConfig ? 'unknown' : 'none';
    ciDetail = hasCiConfig ? 'CI configured but no runs found' : 'No CI configuration detected';
  } else {
    const latest = runs[0] as { conclusion?: string; status?: string; name?: string };
    if (latest.conclusion === 'success') {
      ciStatus = 'passing';
      ciDetail = 'Latest workflow run passing';
    } else if (latest.conclusion === 'failure' || latest.conclusion === 'timed_out') {
      ciStatus = 'failing';
      ciDetail = `Latest workflow run: ${latest.conclusion}`;
    } else {
      ciStatus = 'unknown';
      ciDetail = `Latest workflow run: ${latest.status ?? latest.conclusion ?? 'unknown'}`;
    }
  }

  // Tests: look for common test markers
  const testMarkers = ['__tests__', 'tests', 'test', 'vitest.config.ts', 'jest.config.js'];
  const testChecks = await Promise.all(
    testMarkers.map((f) =>
      safe(`file:${f}`, () =>
        client.fileExists({ owner: ref.owner, repo: ref.repo }, f, meta.defaultBranch),
      ),
    ),
  );
  let hasTests = testChecks.some((v) => v === true);
  if (!hasTests) {
    const pkgText = await safe('file:package.json', () =>
      client.getFileText({ owner: ref.owner, repo: ref.repo }, 'package.json', meta.defaultBranch),
    );
    if (pkgText) {
      try {
        const pkg = JSON.parse(pkgText) as { scripts?: Record<string, string> };
        if (pkg.scripts && typeof pkg.scripts['test'] === 'string') {
          hasTests = !/echo\s+["']?no test/i.test(pkg.scripts['test']);
        }
      } catch {
        // ignore malformed package.json
      }
    }
  }

  // README length for doc quality
  let readmeLength: number | null = null;
  if (hasReadme) {
    const candidates = ['README.md', 'README', 'readme.md', 'Readme.md'].filter((f) =>
      presence.get(f),
    );
    for (const c of candidates) {
      const text = await safe(`file:${c}`, () =>
        client.getFileText({ owner: ref.owner, repo: ref.repo }, c, meta.defaultBranch),
      );
      if (typeof text === 'string') {
        readmeLength = text.length;
        break;
      }
    }
  }

  // Manifests: which are present, then parse the readable ones
  const presentFiles = [...presence.entries()].filter(([, v]) => v).map(([k]) => k);
  const manifests = detectManifests(presentFiles);

  let parsed: ParsedDependency[] = [];
  const depUnavailable: string[] = [];
  for (const m of manifests) {
    if (['package.json', 'requirements.txt', 'Cargo.toml', 'go.mod'].includes(m.path)) {
      const text = await safe(`file:${m.path}`, () =>
        client.getFileText({ owner: ref.owner, repo: ref.repo }, m.path, meta.defaultBranch),
      );
      if (typeof text === 'string') {
        try {
          parsed.push(...parseManifestBody(m.path, text));
        } catch {
          depUnavailable.push(`parse:${m.path}`);
        }
      } else {
        depUnavailable.push(`read:${m.path}`);
      }
    } else {
      depUnavailable.push(`parse:${m.path} (parser not implemented yet)`);
    }
  }
  // de-dupe by ecosystem+name
  const seen = new Set<string>();
  parsed = parsed.filter((d) => {
    const k = `${d.ecosystem}:${d.name}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Latest versions — real lookups only, never guessed.
  const items: DependencyStatus[] = [];
  if (opts.includeLatest === false || offline) {
    for (const d of parsed) items.push(classifyDependency(d, null));
    if (parsed.length > 0) depUnavailable.push('latest-versions (offline mode)');
  } else {
    const latests = await Promise.all(parsed.map((d) => latestVersion(d.ecosystem, d.name)));
    parsed.forEach((d, i) => items.push(classifyDependency(d, latests[i] ?? null)));
    if (latests.every((l) => l === null) && parsed.length > 0) {
      depUnavailable.push('latest-versions (registry unreachable)');
    }
  }
  const outdated = items.filter(
    (d) => d.status === 'outdated' || d.status === 'update-available',
  ).length;
  const unknownCount = items.filter((d) => d.status === 'unknown').length;

  // Activity rollups
  const commitCountSample = commits ? (commits as unknown[]).length : null;
  const contributorCount = contributors ? (contributors as unknown[]).length : null;
  const releaseList = (releases as Array<{ published_at?: string }> | null) ?? null;
  const releaseCount = releaseList ? releaseList.length : releases === null ? null : 0;
  let monthsSinceRelease: number | null = null;
  if (releaseList && releaseList.length > 0) {
    const d = tryParseDate(releaseList[0]?.published_at);
    if (d) monthsSinceRelease = monthsBetween(d, now);
  }

  const openIssues = meta.openIssues;
  // listIssues mixes issues+PRs; open PR count comes from pulls endpoint
  const openPrs = pulls ? (pulls as unknown[]).length : null;
  const branchCount = branches ? (branches as unknown[]).length : null;
  void issues;
  void languages;

  const scoreInputs: ScoreInputs = {
    archived: meta.archived,
    monthsSincePush,
    commitCount90d: commitCountSample,
    contributorCount,
    outdatedDeps: outdated,
    totalDeps: parsed.length > 0 ? parsed.length : manifests.length > 0 ? null : 0,
    ciStatus,
    hasReadme,
    readmeLength,
    hasLicense,
    hasTests,
    openIssues,
    openPrs,
    releaseCount,
    monthsSinceRelease,
    unavailable: [...unavailable],
  };
  // scoring weights come from env at CLI layer; defaults here.
  const score = computeScore(scoreInputs);

  const verdict = classifyMaintenance({
    archived: meta.archived,
    monthsSincePush,
    releaseCount,
    monthsSinceRelease,
    openIssues,
    openPrs,
    ciFailing: ciStatus === 'failing',
    outdatedDeps: parsed.length > 0 ? outdated : null,
  });

  const docStatus =
    !hasReadme && !hasLicense
      ? 'missing'
      : hasReadme && (readmeLength ?? 0) > 500
        ? 'good'
        : 'needs-attention';

  const partial: RepoAnalysis = {
    repo: slug,
    fetchedAt,
    metadata: {
      description: meta.description,
      stars: meta.stars,
      forks: meta.forks,
      watchers: meta.watchers,
      openIssues,
      openPrs: openPrs ?? 0,
      createdAt: meta.createdAt,
      pushedAt: meta.pushedAt,
      defaultBranch: meta.defaultBranch,
      archived: meta.archived,
      license: meta.license,
      language: meta.language,
      topics: meta.topics,
    },
    activity: {
      monthsSincePush,
      commitCountSample,
      contributorCount,
      releaseCount,
      monthsSinceRelease,
      branchCount,
    },
    files: {
      readme: hasReadme,
      license: hasLicense,
      ci: hasCiConfig,
      docker: hasDocker,
      tests: hasTests,
      envExample: hasEnvExample,
      manifests,
    },
    ci: { status: ciStatus, detail: ciDetail },
    documentation: {
      status: docStatus,
      detail: hasReadme
        ? `README present (${readmeLength ?? 0} chars)${hasLicense ? ', LICENSE present' : ', LICENSE missing'}`
        : 'README missing',
    },
    dependencies: {
      total: parsed.length,
      outdated,
      unknown: unknownCount,
      items,
      unavailable: depUnavailable,
    },
    score,
    maintenance: verdict,
    revivalPlan: [],
    unavailable,
    rateLimited,
  };
  partial.revivalPlan = buildRevivalPlan(partial);
  return partial;
}
