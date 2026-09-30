# Contributing

Thanks for stopping by. GhostRepo is a small codebase on purpose, and
we'd like to keep it that way.

## Getting started

```bash
npm install
npm test
```

## What makes a good PR

- Fixes a real problem you hit while scanning a real repo.
- Adds or updates tests (`tests/` — no network in tests, stub `fetch`).
- Updates `docs/` if behavior or output changes.
- Keeps the core LLM-free. Optional AI enhancements are fine as long as
  the tool stays fully useful without them.

## Style

- TypeScript strict, small functions, no clever abstractions.
- `npm run format` before you push; CI checks formatting, types, lint, tests.
- Commit messages in the usual shape: `feat: …`, `fix: …`, `docs: …`, `chore: …`.

## Reporting bugs

Include the repo you scanned (if public), the command you ran, and the
output. Redact tokens — GhostRepo never prints them, and neither should
issue reports.
