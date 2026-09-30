# Security model

GhostRepo scans strangers' code. It treats everything from a scanned
repository as **untrusted input**.

## Rules

1. **Strict input validation.** `parseRepo` accepts only `owner/repo`
   shapes or `github.com` URLs. Segments with `..`, slashes, spaces, or
   control characters are rejected. Report output paths must stay inside
   the working directory.
2. **Token protection.** The GitHub token is read from
   `GHOSTREPO_GITHUB_TOKEN` (or `GITHUB_TOKEN` / `GH_TOKEN`). It is sent
   only as an `Authorization` header, never printed, never written to
   reports, and never committed (`.env` is gitignored; `.env.example`
   ships empty).
3. **No secret logging.** Errors include status codes and paths, never
   headers or tokens.
4. **Safe subprocess execution.** `cli/src/lib/exec.ts` allowlists `gh`
   and `git`, uses argv-based `execFile` (no shell), and rejects
   arguments containing control characters.
5. **No code execution from scanned repos.** Manifests are parsed as
   text. `modernize --apply` only _creates_ two well-known CI files and
   only when they don't already exist — it never edits or runs repo code.
6. **Explicit confirmation for external actions.** Pushing requires
   `--yes`; creating repos/branches never happens silently. The default
   `modernize` run only writes `.plan/modernization.md` for human review.
7. **HTML escaping.** The HTML report escapes all repository-controlled
   strings (descriptions, names, evidence).

## Reporting a vulnerability

See `SECURITY.md`. Please don't open a public issue for a suspected
vulnerability — email the maintainer listed there.
