# Development

Requirements: Node 20+, npm 9+.

```bash
npm install
npm test            # vitest, 26 tests, no network
npm run typecheck
npm run lint
npm run format
npm run build:packages
npm run build:dashboard
```

## Layout

```text
cli/                 commander CLI (bin: ghostrepo)
packages/core        orchestration, heuristics, revival plans
packages/github      REST client
packages/scoring     pure scoring function
packages/dependencies manifest parsers + registry lookups
packages/reports     json / markdown / html exporters
apps/dashboard       Next.js UI (server components call core directly)
fixtures/            sample payloads used by tests and docs
docs/                architecture, scoring, security, cli, roadmap
```

## Conventions

- TypeScript strict, ESM (`NodeNext`-compatible style, `.js` import suffixes).
- Prettier + ESLint; CI runs `format:check`, `typecheck`, `lint`, `test`, both builds.
- Cross-package imports use workspace names (`@ghostrepo/core`).
  The root `tsconfig.json` maps them to `src/` for tests; each package
  builds to `dist/` and resolves siblings through `node_modules`.
- Tests never touch the network — stub `fetch` or use fixtures.
- Don't invent data: unknown latest versions, rate-limited metrics, and
  missing files must surface as `unknown`/`unavailable` in output.
