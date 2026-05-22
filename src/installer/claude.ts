/* eslint-disable no-console */
// ─── Claude install flow ─────────────────────────────────────────────────────
// Writes plugin artifacts and registers them with the Claude CLI.

import { createInterface } from 'node:readline';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generateArtifacts } from './artifacts.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClaudeInstallOptions {
  scope: 'user' | 'project' | 'local';
  yes: boolean;
  manual: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} [y/N]: `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

function commandExists(cmd: string): boolean {
  try {
    execFileSync('which', [cmd], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function runClaude(args: string[]): string {
  try {
    return execFileSync('claude', args, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string };
    return err.stdout ?? err.stderr ?? '';
  }
}

async function writeArtifacts(
  marketplaceDir: string,
  files: Record<string, string>,
  mcpJsPath: string
): Promise<void> {
  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = join(marketplaceDir, relPath);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, 'utf8');
  }

  const distDir = join(marketplaceDir, 'plugins/spotme/dist');
  await mkdir(distDir, { recursive: true });

  if (existsSync(mcpJsPath)) {
    await copyFile(mcpJsPath, join(distDir, 'claude-mcp.js'));
  } else {
    console.warn(
      `Warning: bundled MCP server not found at ${mcpJsPath}. Run \`bun run build\` first.`
    );
  }
}

// ─── Install ──────────────────────────────────────────────────────────────────

export async function installClaude(opts: ClaudeInstallOptions): Promise<void> {
  const marketplaceDir = join(homedir(), '.spotme', 'claude-marketplace');
  const pluginDir = join(marketplaceDir, 'plugins', 'spotme');

  const selfDir = dirname(fileURLToPath(import.meta.url));
  const mcpJsPath = resolve(selfDir, 'claude-mcp.js');

  const pkgPath = resolve(selfDir, '..', 'package.json');
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8')) as { version: string };
  const packageVersion = pkg.version;

  const { files } = generateArtifacts({ packageVersion, pluginRoot: marketplaceDir, mcpJsPath });

  const manualCommands = [
    `claude plugin marketplace add ${marketplaceDir}`,
    `claude plugin install spotme`,
    `# Then fully restart Claude Code. SpotMe's PreToolUse hook won't load without it.`,
  ].join('\n');

  if (opts.manual) {
    console.log('Generated plugin files will be written to:');
    console.log(`  Marketplace: ${marketplaceDir}`);
    console.log(`  Plugin:      ${pluginDir}`);
    console.log('');
    console.log('Run these commands manually after writing:');
    console.log(manualCommands);
    await writeArtifacts(marketplaceDir, files, mcpJsPath);
    return;
  }

  if (!opts.yes) {
    console.log('SpotMe Claude install will:');
    console.log(`  - Write plugin artifacts to: ${marketplaceDir}`);
    console.log(`  - Register marketplace with Claude CLI`);
    console.log(`  - Install or update the spotme plugin`);
    console.log('');
    const ok = await confirm('Proceed?');
    if (!ok) {
      console.log('Aborted.');
      return;
    }
  }

  await writeArtifacts(marketplaceDir, files, mcpJsPath);
  console.log(`Plugin files written to ${marketplaceDir}`);

  if (!commandExists('claude')) {
    console.log('');
    console.log('`claude` binary not found. Run these commands manually:');
    console.log(manualCommands);
    return;
  }

  const marketplaceList = runClaude(['plugin', 'marketplace', 'list']);
  const marketplaceRegistered = marketplaceList.includes(marketplaceDir);

  if (marketplaceRegistered) {
    runClaude(['plugin', 'marketplace', 'update', marketplaceDir]);
    console.log('Marketplace updated.');
  } else {
    runClaude(['plugin', 'marketplace', 'add', marketplaceDir]);
    console.log('Marketplace registered.');
  }

  const pluginList = runClaude(['plugin', 'list']);
  const pluginInstalled = pluginList.includes('spotme');

  if (pluginInstalled) {
    runClaude(['plugin', 'update', 'spotme']);
    console.log('Plugin updated.');
  } else {
    runClaude(['plugin', 'install', 'spotme']);
    console.log('Plugin installed.');
  }

  console.log('');
  console.log("⚠ Fully restart Claude Code. SpotMe's PreToolUse hook won't load without it.");
}
