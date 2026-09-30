import { describe, expect, it } from 'vitest';
import { parseRepo } from '@ghostrepo/core';

describe('parseRepo', () => {
  it('parses owner/repo', () => {
    expect(parseRepo('acme/tool')).toEqual({ owner: 'acme', repo: 'tool' });
  });

  it('parses https URLs with trailing slash and .git', () => {
    expect(parseRepo('https://github.com/acme/tool/')).toEqual({ owner: 'acme', repo: 'tool' });
    expect(parseRepo('https://github.com/acme/tool.git')).toEqual({ owner: 'acme', repo: 'tool' });
  });

  it('parses bare github.com paths', () => {
    expect(parseRepo('github.com/acme/tool')).toEqual({ owner: 'acme', repo: 'tool' });
  });

  it('rejects invalid input', () => {
    expect(() => parseRepo('not-a-repo')).toThrow();
    expect(() => parseRepo('')).toThrow();
    expect(() => parseRepo('owner/../escape')).toThrow();
    expect(() => parseRepo('owner/repo/extra')).toThrow();
  });
});
