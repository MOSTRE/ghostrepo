import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface ExecResult {
  stdout: string;
  stderr: string;
}

/**
 * Safe subprocess execution: argv-based, no shell, allowlisted commands only.
 * Repository contents are never passed to a shell.
 */
const ALLOWED = new Set(['gh', 'git']);

export async function safeExec(cmd: 'gh' | 'git', args: string[]): Promise<ExecResult> {
  if (!ALLOWED.has(cmd)) throw new Error(`Command not allowed: ${cmd}`);
  // Basic guard: refuse args containing shell metacharacters that suggest injection.
  for (const a of args) {
    if (/[\n\r\0]/.test(a)) throw new Error('Refusing argument with control characters');
  }
  const { stdout, stderr } = await execFileAsync(cmd, args, { timeout: 60000 });
  return { stdout, stderr };
}

export async function commandExists(cmd: string): Promise<boolean> {
  try {
    await execFileAsync(cmd, ['--version'], { timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}
