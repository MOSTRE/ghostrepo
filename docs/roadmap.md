# Roadmap

v0.1 is intentionally read-only: scan, understand, plan. Anything that
changes code or opens PRs needs a human in the loop.

## Next (planned)

- [ ] More manifest parsers: `pnpm-lock.yaml`, `yarn.lock`, `pyproject.toml`, `pom.xml`, `build.gradle`, `composer.json`, `Gemfile`
- [ ] `latestVersion` support for Go modules and Maven Central
- [ ] Commit-frequency sparkline (12-month histogram via the API)
- [ ] Stale-branch listing (names + last commit per branch)
- [ ] `ghostrepo watch owner/repo` — re-scan on a schedule, diff the score
- [ ] Dashboard: compare two repos side by side
- [ ] Publish `ghostrepo` to npm and the Action to the Marketplace

## Later (needs design + safety review)

- [ ] Patch generation (`modernize --patch` producing a diff, never pushing)
- [ ] Optional PR creation with explicit approval and a full diff preview
- [ ] Opt-in LLM summaries clearly labeled as generated (core stays LLM-free)

Have an idea? Open an issue — half-formed thoughts welcome.
