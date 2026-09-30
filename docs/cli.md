# CLI reference

```bash
ghostrepo scan owner/repo
ghostrepo scan https://github.com/owner/repo
```

## Commands

| Command              | Description                                                                        |
| -------------------- | ---------------------------------------------------------------------------------- |
| `scan <repo>`        | Full scan: health, activity, deps, CI, docs, revival plan                          |
| `score <repo>`       | Transparent score breakdown per category                                           |
| `deps <repo>`        | Dependency health table (current vs latest vs status)                              |
| `activity <repo>`    | Commit/issue/PR/release activity + abandonment evidence                            |
| `plan <repo>`        | Prioritized revival plan (P0–P3 with why/risk/effort)                              |
| `modernize <repo>`   | Write `.plan/modernization.md`; `--apply` creates safe local files on a new branch |
| `report <repo>`      | Write `ghostrepo-report.json` (+ `--markdown` / `--html`)                          |
| `auth login`         | Check token / `gh` auth status                                                     |
| `repo create [name]` | Print the `gh repo create` command (asks for confirmation; does not run blindly)   |
| `repo publish --yes` | Explicit opt-in push helper                                                        |

## Export formats

```bash
ghostrepo scan owner/repo --json        # raw JSON to stdout
ghostrepo scan owner/repo --markdown    # also writes ghostrepo-report.md
ghostrepo scan owner/repo --html        # also writes ghostrepo-report.html
ghostrepo scan owner/repo --out ./out --markdown --html
ghostrepo scan owner/repo --no-latest   # skip registry lookups (offline-friendly)
```

## Environment

| Variable                 | Purpose                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| `GHOSTREPO_GITHUB_TOKEN` | GitHub token (60 req/hr → 5,000 req/hr). Falls back to `GITHUB_TOKEN` / `GH_TOKEN` / `gh` auth |
| `GHOSTREPO_OFFLINE=1`    | Skip all "latest version" lookups; latest shows as `unknown`                                   |
| `GHOSTREPO_WEIGHT_*`     | Override score weights (see `docs/scoring.md`)                                                 |

## Exit codes

`0` on success, `1` on scan failure (bad ref, repo not found, network
error). Rate limits don't fail the scan — affected metrics are marked
`unavailable` and the report says so.
