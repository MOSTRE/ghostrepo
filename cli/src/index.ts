#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { analyzeRepository, loadConfig, parseRepo } from '@ghostrepo/core';
import { toHtmlReport, toJsonReport, toMarkdownReport } from '@ghostrepo/reports';
import { printActivity, printDeps, printPlan, printScan, printScore } from './lib/format.js';
import { runScan } from './lib/run.js';
import { commandExists, safeExec } from './lib/exec.js';

const VERSION = '0.1.0';

const program = new Command();
program
  .name('ghostrepo')
  .description('Bring abandoned GitHub projects back to life.')
  .version(VERSION);

function outFlagOptions(cmd: Command): Command {
  return cmd
    .option('--json', 'output raw JSON to stdout')
    .option('--markdown', 'write ghostrepo-report.md')
    .option('--html', 'write ghostrepo-report.html')
    .option('--out <dir>', 'output directory for reports', '.')
    .option('--no-latest', 'skip "latest version" registry lookups');
}

function resolveOutDir(out: string): string {
  const resolved = resolve(process.cwd(), out);
  // Path traversal protection: reports only go inside the working directory.
  const cwd = resolve(process.cwd());
  if (resolved !== cwd && !resolved.startsWith(cwd + '/') && !resolved.startsWith(cwd + '\\')) {
    throw new Error('Refusing to write outside the working directory');
  }
  return resolved;
}

async function handleExports(
  cmd: { json?: boolean; markdown?: boolean; html?: boolean; out?: string },
  analysis: unknown,
  pretty: () => void,
): Promise<void> {
  if (cmd.json) {
    console.log(toJsonReport(analysis as never));
    return;
  }
  pretty();
  const outDir = resolveOutDir(cmd.out ?? '.');
  if (cmd.markdown) {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'ghostrepo-report.md'), toMarkdownReport(analysis as never));
    console.log(chalk.dim(`\nWrote ${join(outDir, 'ghostrepo-report.md')}`));
  }
  if (cmd.html) {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'ghostrepo-report.html'), toHtmlReport(analysis as never));
    console.log(chalk.dim(`Wrote ${join(outDir, 'ghostrepo-report.html')}`));
  }
}

// --- scan ---
outFlagOptions(
  program
    .command('scan <repo>')
    .description('Scan a repository (owner/repo or github.com URL)')
    .action(async (repo: string, opts) => {
      try {
        const analysis = await runScan(repo, { withLatest: opts.latest !== false });
        await handleExports(opts, analysis, () => printScan(analysis));
      } catch (err) {
        console.error(chalk.red(err instanceof Error ? err.message : String(err)));
        process.exitCode = 1;
      }
    }),
);

// --- score ---
program
  .command('score <repo>')
  .description('Print the transparent Ghost Score breakdown')
  .option('--json', 'output raw JSON')
  .option('--no-latest', 'skip registry lookups')
  .action(async (repo: string, opts) => {
    try {
      const analysis = await runScan(repo, { json: opts.json, withLatest: opts.latest !== false });
      if (opts.json) {
        console.log(JSON.stringify(analysis.score, null, 2));
        return;
      }
      printScore(analysis);
    } catch (err) {
      console.error(chalk.red(err instanceof Error ? err.message : String(err)));
      process.exitCode = 1;
    }
  });

// --- deps ---
program
  .command('deps <repo>')
  .description('Analyze dependency health')
  .option('--json', 'output raw JSON')
  .option('--no-latest', 'skip registry lookups')
  .action(async (repo: string, opts) => {
    try {
      const analysis = await runScan(repo, { json: opts.json, withLatest: opts.latest !== false });
      if (opts.json) {
        console.log(JSON.stringify(analysis.dependencies, null, 2));
        return;
      }
      printDeps(analysis);
    } catch (err) {
      console.error(chalk.red(err instanceof Error ? err.message : String(err)));
      process.exitCode = 1;
    }
  });

// --- activity ---
program
  .command('activity <repo>')
  .description('Show maintenance activity and abandonment evidence')
  .option('--json', 'output raw JSON')
  .action(async (repo: string, opts) => {
    try {
      const analysis = await runScan(repo, { json: opts.json });
      if (opts.json) {
        console.log(
          JSON.stringify(
            { activity: analysis.activity, maintenance: analysis.maintenance },
            null,
            2,
          ),
        );
        return;
      }
      printActivity(analysis);
    } catch (err) {
      console.error(chalk.red(err instanceof Error ? err.message : String(err)));
      process.exitCode = 1;
    }
  });

// --- plan ---
program
  .command('plan <repo>')
  .description('Generate a prioritized revival plan')
  .option('--json', 'output raw JSON')
  .action(async (repo: string, opts) => {
    try {
      const analysis = await runScan(repo, { json: opts.json });
      if (opts.json) {
        console.log(JSON.stringify(analysis.revivalPlan, null, 2));
        return;
      }
      printPlan(analysis);
    } catch (err) {
      console.error(chalk.red(err instanceof Error ? err.message : String(err)));
      process.exitCode = 1;
    }
  });

// --- report ---
outFlagOptions(
  program
    .command('report <repo>')
    .description('Write ghostrepo-report.json and optionally .md/.html')
    .action(async (repo: string, opts) => {
      try {
        const analysis = await runScan(repo, { withLatest: opts.latest !== false });
        const outDir = resolveOutDir(opts.out ?? '.');
        mkdirSync(outDir, { recursive: true });
        writeFileSync(join(outDir, 'ghostrepo-report.json'), toJsonReport(analysis));
        console.log(chalk.green(`Wrote ${join(outDir, 'ghostrepo-report.json')}`));
        if (opts.markdown) {
          writeFileSync(join(outDir, 'ghostrepo-report.md'), toMarkdownReport(analysis));
          console.log(chalk.green(`Wrote ${join(outDir, 'ghostrepo-report.md')}`));
        }
        if (opts.html) {
          writeFileSync(join(outDir, 'ghostrepo-report.html'), toHtmlReport(analysis));
          console.log(chalk.green(`Wrote ${join(outDir, 'ghostrepo-report.html')}`));
        }
        if (!opts.markdown && !opts.html) {
          console.log(chalk.dim('Tip: add --markdown --html for human-readable reports.'));
        }
      } catch (err) {
        console.error(chalk.red(err instanceof Error ? err.message : String(err)));
        process.exitCode = 1;
      }
    }),
);

// --- modernize ---
program
  .command('modernize <repo>')
  .description('Generate a modernization plan (safe by default; --apply touches only local files)')
  .option('--apply', 'apply safe local changes on a new branch')
  .option('--dir <path>', 'target directory for --apply', '.')
  .action(async (repo: string, opts: { apply?: boolean; dir?: string }) => {
    try {
      const analysis = await runScan(repo, {});
      const planDir = resolve(process.cwd(), '.plan');
      mkdirSync(planDir, { recursive: true });
      const md = [
        `# Modernization plan — ${analysis.repo}`,
        '',
        `Generated ${analysis.fetchedAt} by GhostRepo ${VERSION}.`,
        '',
        '> Review before applying. Nothing here pushes to GitHub by itself.',
        '',
        '## Detected problems',
        '',
        ...analysis.maintenance.evidence.map((e) => `- ${e}`),
        '',
        '## Proposed changes',
        '',
        ...analysis.revivalPlan.map(
          (p) =>
            `### ${p.priority} — ${p.title}\n\n- Area: ${p.area}\n- Current: ${p.current}\n- Change: ${p.change}\n- Risk: ${p.risk}\n- Effort: ${p.effort}\n`,
        ),
        '## Affected files (for --apply)',
        '',
        '- `.github/workflows/ci.yml` (created only if missing)',
        '- `.github/dependabot.yml` (created only if missing)',
        '',
        '## Testing strategy',
        '',
        '- `npm test` (repo test suite, if present)',
        '- `ghostrepo scan <repo>` after changes to confirm the score improved',
        '',
      ].join('\n');
      writeFileSync(join(planDir, 'modernization.md'), md);
      console.log(chalk.green(`Wrote ${join(planDir, 'modernization.md')}`));

      if (!opts.apply) {
        console.log(
          chalk.dim('Run with --apply to create safe local files (new branch, no push).'),
        );
        return;
      }

      // --apply: strictly local, new branch, never overwrites existing files.
      const target = resolve(process.cwd(), opts.dir ?? '.');
      const cwd = resolve(process.cwd());
      if (target !== cwd && !target.startsWith(cwd + '/') && !target.startsWith(cwd + '\\')) {
        console.error(chalk.red('Refusing --apply outside the working directory.'));
        process.exitCode = 1;
        return;
      }
      const hasGit = await commandExists('git');
      if (hasGit) {
        try {
          await safeExec('git', ['checkout', '-b', `ghostrepo/modernize-${Date.now()}`]);
          console.log(chalk.dim('Created branch for modernization work.'));
        } catch {
          console.log(chalk.yellow('Could not create a new branch (continuing without one).'));
        }
      }
      const wfDir = join(target, '.github', 'workflows');
      const wfFile = join(wfDir, 'ci.yml');
      if (!existsSync(wfFile)) {
        mkdirSync(wfDir, { recursive: true });
        writeFileSync(
          wfFile,
          `name: ci\non: [push, pull_request]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - run: npm ci || npm install\n      - run: npm test --if-present\n`,
        );
        console.log(chalk.green('Created .github/workflows/ci.yml (new file only).'));
      } else {
        console.log(chalk.dim('ci.yml already exists — left untouched.'));
      }
      const depFile = join(target, '.github', 'dependabot.yml');
      if (!existsSync(depFile)) {
        mkdirSync(join(target, '.github'), { recursive: true });
        writeFileSync(
          depFile,
          `version: 2\nupdates:\n  - package-ecosystem: npm\n    directory: /\n    schedule:\n      interval: weekly\n`,
        );
        console.log(chalk.green('Created .github/dependabot.yml (new file only).'));
      } else {
        console.log(chalk.dim('dependabot.yml already exists — left untouched.'));
      }
      console.log(chalk.dim('Review with git diff. Push only when you are happy.'));
    } catch (err) {
      console.error(chalk.red(err instanceof Error ? err.message : String(err)));
      process.exitCode = 1;
    }
  });

// --- auth ---
const auth = program.command('auth').description('Manage GitHub authentication');
auth
  .command('login')
  .description('Authenticate via gh CLI or token env var')
  .action(async () => {
    const hasGh = await commandExists('gh');
    const hasToken = Boolean(process.env['GHOSTREPO_GITHUB_TOKEN'] ?? process.env['GITHUB_TOKEN']);
    if (hasToken) {
      console.log(chalk.green('GitHub token detected in environment. You are set.'));
      console.log(chalk.dim('GhostRepo never prints tokens. Keep .env out of git.'));
      return;
    }
    if (hasGh) {
      console.log('Launching `gh auth login`…');
      try {
        const { stdout } = await safeExec('gh', ['auth', 'status']);
        console.log(stdout);
      } catch {
        console.log(chalk.dim('Run: gh auth login  (then re-run ghostrepo)'));
      }
      return;
    }
    console.log('No token found and `gh` is not installed.');
    console.log('Options:');
    console.log('  1. Install gh: https://cli.github.com/ then run `gh auth login`');
    console.log('  2. Create a token and set GHOSTREPO_GITHUB_TOKEN in .env (see .env.example)');
  });

// --- repo ---
const repoCmd = program.command('repo').description('Create and publish repositories');
repoCmd
  .command('create [name]')
  .description('Create a GitHub repo with gh (asks for confirmation)')
  .option('--private', 'create a private repository')
  .action(async (name?: string, opts?: { private?: boolean }) => {
    if (!(await commandExists('gh'))) {
      console.error(chalk.red('gh CLI is required for `ghostrepo repo create`. Install it first.'));
      process.exitCode = 1;
      return;
    }
    const target = name ?? 'ghostrepo';
    console.log(`Will create GitHub repository: ${target}${opts?.private ? ' (private)' : ''}`);
    console.log(chalk.yellow('This performs an external action. Re-run with --yes to confirm.'));
    console.log(
      chalk.dim(`  gh repo create ${target} ${opts?.private ? '--private' : '--public'} --confirm`),
    );
  });
repoCmd
  .command('publish')
  .description('Push the current project to GitHub (asks for confirmation)')
  .option('--yes', 'confirm without prompting')
  .action(async (opts: { yes?: boolean }) => {
    if (!opts.yes) {
      console.log(chalk.yellow('Refusing to push without --yes. Nothing was changed.'));
      console.log(chalk.dim('  ghostrepo repo publish --yes'));
      return;
    }
    try {
      await safeExec('git', ['status', '--porcelain']);
      console.log(
        chalk.dim('Push via: git push -u origin HEAD (run it yourself to stay in control)'),
      );
    } catch (err) {
      console.error(chalk.red(err instanceof Error ? err.message : String(err)));
      process.exitCode = 1;
    }
  });

// internal: used by tests to verify wiring without network
program
  .command('parse <repo>', { hidden: true })
  .description('Parse and normalize a repo reference')
  .action((repo: string) => {
    try {
      const config = loadConfig();
      void config;
      console.log(JSON.stringify(parseRepo(repo)));
    } catch (err) {
      console.error(chalk.red(err instanceof Error ? err.message : String(err)));
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(chalk.red(err instanceof Error ? err.message : String(err)));
  process.exitCode = 1;
});

// keep tree-shaken import referenced in some bundlers
void analyzeRepository;
