# Architecture

GhostRepo is a small monorepo. The data flow is deliberately linear —
there is no hidden magic between the CLI and the report:

```text
CLI
 ↓
Core (orchestration: parse → fetch → analyze → score → plan)
 ↓
GitHub Provider (REST client, typed errors, rate-limit handling)
 ↓
Repository Analyzer (file presence, activity rollups, CI, docs, tests)
 ↓
Scoring Engine (transparent weighted formula, see scoring.md)
 ↓
Report Generator (JSON / Markdown / HTML)
 ↓
Dashboard · GitHub Action (consumers of the same analysis)
```

## Packages

| Package                 | Responsibility                                                                                                                                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/github`       | Thin REST client over `fetch`. Maps payloads to `RepoMetadata`, exposes `fileExists`/`getFileText`, converts failures to `GitHubApiError` (with `rateLimited` flag). Never logs tokens.                                                                |
| `packages/dependencies` | Manifest detection (`detectManifests`), offline parsers for `package.json`, `requirements.txt`, `Cargo.toml`, `go.mod`, and real `latestVersion` lookups (npm, PyPI, crates.io). Returns `null` when offline — callers print `unknown`, never a guess. |
| `packages/scoring`      | `computeScore(inputs, weights)`. Pure function, no I/O, fully unit-tested.                                                                                                                                                                             |
| `packages/core`         | `parseRepo` (strict input validation), `analyzeRepository` (the orchestrator), `classifyMaintenance` (cautious abandonment heuristic), `buildRevivalPlan` (prioritized actions), `loadConfig` (env-based weights).                                     |
| `packages/reports`      | `toJsonReport` / `toMarkdownReport` / `toHtmlReport`. HTML escapes all repository-controlled strings.                                                                                                                                                  |
| `cli`                   | Commander-based UX, pretty terminal output, safe `modernize --apply` (new branch, new files only), `gh`-based auth/publish helpers.                                                                                                                    |
| `apps/dashboard`        | Next.js app. Server components call `analyzeRepository` directly (via `transpilePackages`). No duplicated scoring logic.                                                                                                                               |

## Key decisions

- **Missing data earns zero, not the benefit of the doubt.** Every `null` from the API becomes an `unavailable` note in the report.
- **Repository contents are untrusted text.** Manifests are parsed, never executed. Nothing from a scanned repo reaches a shell.
- **No network in tests.** The suite uses fixtures and stubbed `fetch`.
