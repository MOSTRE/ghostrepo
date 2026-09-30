# Security policy

GhostRepo scans untrusted repositories, so security reports matter here.

## Supported versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |

## Reporting a vulnerability

Please **do not** open a public issue. Instead, open a
[private security advisory](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities)
on this repository, or contact the maintainer through their GitHub profile.

Include:

- What you did (commands, inputs)
- What you expected vs. what happened
- Whether any secret or code execution was involved

We aim to acknowledge reports within a few days and will credit reporters
unless they'd rather stay anonymous.

## Scope notes

- GhostRepo never executes code from scanned repositories. If you find a
  path where it does, that's a critical bug — report it immediately.
- Tokens must never appear in output, reports, or logs. Same treatment.
