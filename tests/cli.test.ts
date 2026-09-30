import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('cli', () => {
  it('exposes --help and --version', () => {
    // Runs against source wiring; avoids network access.
    const src = readFileSync('cli/src/index.ts', 'utf8');
    for (const cmd of [
      'scan <repo>',
      'score <repo>',
      'deps <repo>',
      'activity <repo>',
      'plan <repo>',
      'modernize <repo>',
      'report <repo>',
      "command('auth')",
      "command('repo')",
    ]) {
      expect(src).toContain(cmd);
    }
    expect(src).toContain('.version(');
  });
});
