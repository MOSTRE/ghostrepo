import { describe, expect, it } from 'vitest';
import {
  classifyDependency,
  detectManifests,
  parseCargoToml,
  parseGoMod,
  parsePackageJson,
  parseRequirementsTxt,
} from '@ghostrepo/dependencies';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('dependency parsing', () => {
  it('detects known manifests', () => {
    const found = detectManifests(['package.json', 'README.md', 'Cargo.toml']);
    expect(found.map((f) => f.path).sort()).toEqual(['Cargo.toml', 'package.json']);
  });

  it('parses the sample package.json fixture', () => {
    const text = readFileSync(join(process.cwd(), 'fixtures', 'package.sample.json'), 'utf8');
    const deps = parsePackageJson(text);
    const names = deps.map((d) => d.name).sort();
    expect(names).toEqual(['eslint', 'lodash', 'react', 'typescript']);
    expect(deps.find((d) => d.name === 'eslint')?.dev).toBe(true);
  });

  it('parses requirements.txt', () => {
    const deps = parseRequirementsTxt('requests==2.31.0\n# comment\nflask>=2.0\n');
    expect(deps.map((d) => d.name)).toEqual(['requests', 'flask']);
  });

  it('parses Cargo.toml and go.mod', () => {
    expect(parseCargoToml('[dependencies]\nserde = "1.0"\n')).toHaveLength(1);
    expect(parseGoMod('module x\n\nrequire (\n\tgithub.com/a/b v1.2.3\n)')).toHaveLength(1);
  });

  it('classifies without inventing latest versions', () => {
    const dep = { name: 'x', current: '1.0.0', ecosystem: 'npm' as const, dev: false };
    const unknown = classifyDependency(dep, null);
    expect(unknown.status).toBe('unknown');
    expect(unknown.latest).toBeNull();
    expect(classifyDependency(dep, '1.0.0').status).toBe('current');
    expect(classifyDependency(dep, '2.0.0').status).toBe('outdated');
  });
});
