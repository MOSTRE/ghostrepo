import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

function src(pkg: string): string {
  return fileURLToPath(new URL(`./packages/${pkg}/src/index.ts`, import.meta.url));
}

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@ghostrepo/core': src('core'),
      '@ghostrepo/github': src('github'),
      '@ghostrepo/scoring': src('scoring'),
      '@ghostrepo/dependencies': src('dependencies'),
      '@ghostrepo/reports': src('reports'),
    },
  },
});
