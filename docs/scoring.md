# Scoring methodology

The Ghost Score is a **transparent weighted sum**, not an AI judgment.
It runs from 0 to 100. The default weights sum to 100:

| Category        | Weight | What earns points                                                                    |
| --------------- | ------ | ------------------------------------------------------------------------------------ |
| Maintenance     | 25     | Repository is not archived; last push was recent (decays: 1.0 at ≤1mo → 0 past 24mo) |
| Recent activity | 20     | Commits in a 30-commit sample (70%) + contributor count (30%)                        |
| Dependencies    | 15     | Share of parsed dependencies that are not outdated                                   |
| CI health       | 15     | Passing runs = full; failing = 25%; no CI config = 40%; unknown = 0                  |
| Documentation   | 10     | README present and substantive (70%) + LICENSE (30%)                                 |
| Tests           | 5      | Any test files, test config, or working `test` script                                |
| Issues/PRs      | 5      | Decreases as the open backlog grows (0 backlog = full)                               |
| Releases        | 5      | Has releases (50%) + latest release recency (50%)                                    |

## Worked example

A repo pushed 14 months ago, 1 sampled commit, 1 contributor, 6/10 deps
outdated, failing CI, short README, no license/tests, 37 issues, 4 PRs,
no releases scores roughly **30/100** — "High" modernization effort.

## Configuring weights

```bash
GHOSTREPO_WEIGHT_MAINTENANCE=30 GHOSTREPO_WEIGHT_CI=10 ghostrepo score owner/repo
```

Available variables: `GHOSTREPO_WEIGHT_MAINTENANCE`, `_ACTIVITY`,
`_DEPENDENCIES`, `_CI`, `_DOCUMENTATION`, `_TESTS`, `_ISSUES`, `_RELEASES`.
A zeroed-out config falls back to defaults.

## What the score is not

- It does not measure code quality, only maintenance signals.
- It does not punish small repos for having few contributors beyond the activity slice.
- Missing data scores 0 for that slice and is listed under `unavailable` —
  a repo is never called healthy because a check failed silently.
