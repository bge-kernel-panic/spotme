#!/usr/bin/env node
/* eslint-disable no-console */
// ─── SpotMe CLI ──────────────────────────────────────────────────────────────
// Global installer CLI for SpotMe.

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installClaude } from './installer/claude.js';
import { installOpenCode } from './installer/opencode.js';

// ─── Usage ─────────────────────────────────────────────────────────────────────

const USAGE = `
SpotMe installer CLI

Usage:
  spotme version
  spotme install claude [--scope user|project|local] [--yes] [--manual]
  spotme install opencode [--scope user|project] [--config <path>] [--yes] [--manual]

Options:
  --scope   Installation scope (default: user)
  --yes     Skip confirmation prompts
  --manual  Print instructions without applying changes (Claude: also writes files)
  --config  Path to opencode config file (opencode install only)
  --help    Show this help
`.trim();

// ─── Arg parsing ──────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);

function flag(name: string): boolean {
  return argv.includes(name);
}

function option(name: string): string | undefined {
  const idx = argv.indexOf(name);
  return idx !== -1 ? argv[idx + 1] : undefined;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const [cmd, sub] = argv;

  if (!cmd || flag('--help') || flag('-h')) {
    console.log(USAGE);
    return;
  }

  if (cmd === 'version') {
    const selfDir = dirname(fileURLToPath(import.meta.url));
    const pkgPath = resolve(selfDir, '../package.json');
    const pkg = JSON.parse(await readFile(pkgPath, 'utf8')) as { version: string };
    console.log(pkg.version);
    return;
  }

  if (cmd === 'install') {
    const yes = flag('--yes');
    const manual = flag('--manual');
    const rawScope = option('--scope');

    if (sub === 'claude') {
      const scope = (rawScope ?? 'user') as 'user' | 'project' | 'local';
      if (!['user', 'project', 'local'].includes(scope)) {
        console.error(`Invalid scope "${scope}". Must be user, project, or local.`);
        process.exit(1);
      }
      await installClaude({ scope, yes, manual });
      return;
    }

    if (sub === 'opencode') {
      const scope = (rawScope ?? 'user') as 'user' | 'project';
      if (!['user', 'project'].includes(scope)) {
        console.error(`Invalid scope "${scope}". Must be user or project.`);
        process.exit(1);
      }
      const configPath = option('--config');
      await installOpenCode({ scope, yes, manual, configPath });
      return;
    }

    console.error(`Unknown install target: ${sub ?? '(none)'}`);
    console.log(USAGE);
    process.exit(1);
  }

  console.error(`Unknown command: ${cmd}`);
  console.log(USAGE);
  process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
