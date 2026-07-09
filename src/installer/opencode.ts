/* eslint-disable no-console */
// ─── OpenCode install flow ───────────────────────────────────────────────────
// Adds spotme to the OpenCode plugin list in opencode.json/opencode.jsonc.

import { createInterface } from 'node:readline';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { applyEdits, modify, parseTree, findNodeAtLocation } from 'jsonc-parser/lib/esm/main.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OpenCodeInstallOptions {
  scope: 'user' | 'project';
  configPath?: string;
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

function addSpotmeToPlugins(source: string): string {
  const tree = parseTree(source);

  if (tree) {
    const pluginNode = findNodeAtLocation(tree, ['plugin']);
    if (pluginNode?.type === 'array' && pluginNode.children) {
      const alreadyPresent = pluginNode.children.some(
        (child) => child.type === 'string' && child.value === 'spotme'
      );
      if (alreadyPresent) return source;
    }
  }

  const existing = source.trim() === '' ? '{}' : source;
  const edits = modify(existing, ['plugin', -1], 'spotme', { formattingOptions: {} });
  return applyEdits(existing, edits);
}

function diffLines(before: string, after: string): string {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  const lines: string[] = [];

  const maxLen = Math.max(beforeLines.length, afterLines.length);
  for (let i = 0; i < maxLen; i++) {
    const b = beforeLines[i];
    const a = afterLines[i];
    if (b === undefined) {
      lines.push(`+ ${a}`);
    } else if (a === undefined) {
      lines.push(`- ${b}`);
    } else if (b !== a) {
      lines.push(`- ${b}`);
      lines.push(`+ ${a}`);
    } else {
      lines.push(`  ${b}`);
    }
  }
  return lines.join('\n');
}

// ─── Install ──────────────────────────────────────────────────────────────────

export async function installOpenCode(opts: OpenCodeInstallOptions): Promise<void> {
  const targetPath = opts.configPath
    ? resolve(opts.configPath)
    : opts.scope === 'user'
      ? resolve(homedir(), '.config/opencode/opencode.json')
      : resolve('./opencode.json');

  const configChange = `Add "spotme" to the plugin array in:\n  ${targetPath}`;

  if (opts.manual) {
    console.log('OpenCode install (manual mode):');
    console.log(configChange);
    console.log('');
    console.log('Add "spotme" to the plugin array in your opencode.json:');
    console.log('  { "plugin": ["spotme"] }');
    return;
  }

  let existing = '{}';
  try {
    existing = await readFile(targetPath, 'utf8');
  } catch {
    // File doesn't exist yet — start from empty object
  }

  const updated = addSpotmeToPlugins(existing);

  if (updated === existing) {
    console.log('spotme is already present in the OpenCode config. Nothing to do.');
    return;
  }

  if (!opts.yes) {
    console.log(`Changes to ${targetPath}:`);
    console.log('');
    console.log(diffLines(existing, updated));
    console.log('');
    const ok = await confirm('Apply?');
    if (!ok) {
      console.log('Aborted.');
      return;
    }
  }

  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, updated, 'utf8');
  console.log(`OpenCode config updated: ${targetPath}`);
}
