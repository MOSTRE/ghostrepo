export type Ecosystem =
  'npm' | 'pip' | 'poetry' | 'uv' | 'cargo' | 'gomod' | 'maven' | 'gradle' | 'composer' | 'bundler';

export interface ManifestFile {
  ecosystem: Ecosystem;
  path: string;
  manager: string;
}

export interface ParsedDependency {
  name: string;
  current: string;
  ecosystem: Ecosystem;
  dev: boolean;
}

export interface DependencyStatus extends ParsedDependency {
  latest: string | null;
  status: 'current' | 'outdated' | 'update-available' | 'unknown';
  latestUnavailableReason?: string;
}

/** Files we know how to read. Kept intentionally small — no code execution. */
const KNOWN_MANIFESTS: Array<{ path: string; ecosystem: Ecosystem; manager: string }> = [
  { path: 'package.json', ecosystem: 'npm', manager: 'npm' },
  { path: 'pnpm-lock.yaml', ecosystem: 'npm', manager: 'pnpm' },
  { path: 'yarn.lock', ecosystem: 'npm', manager: 'yarn' },
  { path: 'requirements.txt', ecosystem: 'pip', manager: 'pip' },
  { path: 'pyproject.toml', ecosystem: 'poetry', manager: 'poetry' },
  { path: 'uv.lock', ecosystem: 'uv', manager: 'uv' },
  { path: 'Cargo.toml', ecosystem: 'cargo', manager: 'cargo' },
  { path: 'go.mod', ecosystem: 'gomod', manager: 'go' },
  { path: 'pom.xml', ecosystem: 'maven', manager: 'maven' },
  { path: 'build.gradle', ecosystem: 'gradle', manager: 'gradle' },
  { path: 'composer.json', ecosystem: 'composer', manager: 'composer' },
  { path: 'Gemfile', ecosystem: 'bundler', manager: 'bundler' },
];

export function detectManifests(presentFiles: string[]): ManifestFile[] {
  const set = new Set(presentFiles.map((f) => f.toLowerCase()));
  const out: ManifestFile[] = [];
  for (const m of KNOWN_MANIFESTS) {
    if (set.has(m.path.toLowerCase())) {
      out.push({ ecosystem: m.ecosystem, path: m.path, manager: m.manager });
    }
  }
  return out;
}

export function parsePackageJson(text: string): ParsedDependency[] {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return [];
  }
  const deps: ParsedDependency[] = [];
  for (const [section, dev] of [
    ['dependencies', false],
    ['devDependencies', true],
    ['peerDependencies', false],
  ] as const) {
    const block = data[section];
    if (block && typeof block === 'object') {
      for (const [name, version] of Object.entries(block as Record<string, unknown>)) {
        if (typeof version === 'string') {
          deps.push({ name, current: version.replace(/^[\^~>=<\s]+/, ''), ecosystem: 'npm', dev });
        }
      }
    }
  }
  return deps;
}

export function parseRequirementsTxt(text: string): ParsedDependency[] {
  const deps: ParsedDependency[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('-')) continue;
    const m = line.match(/^([A-Za-z0-9_.-]+)\s*(==|>=|~=|>|<)?\s*([A-Za-z0-9_.*+!-]+)?/);
    if (m) {
      deps.push({
        name: m[1] as string,
        current: (m[3] ?? 'unspecified').trim() || 'unspecified',
        ecosystem: 'pip',
        dev: false,
      });
    }
  }
  return deps;
}

export function parseCargoToml(text: string): ParsedDependency[] {
  const deps: ParsedDependency[] = [];
  let inDeps = false;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('[')) {
      inDeps = line === '[dependencies]' || line === '[dev-dependencies]';
      continue;
    }
    if (!inDeps || !line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Za-z0-9_-]+)\s*=\s*(.+)$/);
    if (m) {
      const ver = (m[2] as string).match(/"([^"]+)"/)?.[1] ?? 'unspecified';
      deps.push({ name: m[1] as string, current: ver, ecosystem: 'cargo', dev: false });
    }
  }
  return deps;
}

export function parseGoMod(text: string): ParsedDependency[] {
  const deps: ParsedDependency[] = [];
  let inBlock = false;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('require (')) {
      inBlock = true;
      continue;
    }
    if (inBlock && line === ')') {
      inBlock = false;
      continue;
    }
    const m = line.match(/^([a-zA-Z0-9_./-]+)\s+v?([0-9][^\s]*)/);
    if ((inBlock || line.startsWith('require ')) && m) {
      deps.push({
        name: m[1] as string,
        current: m[2] as string,
        ecosystem: 'gomod',
        dev: false,
      });
    }
  }
  return deps;
}

function majorOf(version: string): number | null {
  const m = version.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

/**
 * Compare current vs latest without inventing data.
 * If latest is unknown, status is 'unknown' — never guessed.
 */
export function classifyDependency(dep: ParsedDependency, latest: string | null): DependencyStatus {
  if (!latest) {
    return {
      ...dep,
      latest: null,
      status: 'unknown',
      latestUnavailableReason: 'latest version unavailable (offline or registry unreachable)',
    };
  }
  const clean = (v: string) => v.replace(/^[v=\s]+/, '').split(/[+-]/)[0] as string;
  const c = clean(dep.current);
  const l = clean(latest);
  if (c === l) return { ...dep, latest, status: 'current' };
  const cMaj = majorOf(c);
  const lMaj = majorOf(l);
  if (cMaj !== null && lMaj !== null && lMaj > cMaj) {
    return { ...dep, latest, status: 'outdated' };
  }
  return { ...dep, latest, status: 'update-available' };
}
