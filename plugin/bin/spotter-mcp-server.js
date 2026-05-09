#!/usr/bin/env node
// spotter-mcp-server.js
// Minimal MCP stdio server for the Claude Code plugin.
// Exposes: mcp__spotter__spotter_exercise
//
// Protocol: JSON-RPC 2.0 over stdio (MCP standard)
// State: temp files in SPOTTER_STATE_DIR for cross-process (hook <-> MCP) coordination.

import { execSync } from "child_process";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import * as readline from "readline";

const STATE_DIR = process.env.SPOTTER_STATE_DIR ?? `/tmp/spotter-${process.ppid}`;
mkdirSync(STATE_DIR, { recursive: true });

const ACTIVE_FILE = join(STATE_DIR, "active");
const COUNT_FILE = join(STATE_DIR, "count");
const CONFIG_FILE = join(STATE_DIR, "config");
const EXERCISE_FILE = join(STATE_DIR, "exercise.json");

function readJson(file) {
  try { return JSON.parse(readFileSync(file, "utf8")); } catch { return null; }
}

function git(cwd, ...args) {
  return execSync(`git ${args.join(" ")}`, { cwd, encoding: "utf8" }).trim();
}

// ─── Tool implementations ────────────────────────────────────────────────────

function handleActivate(args) {
  const difficulty = args.difficulty ?? "medium";
  const every = args.every ?? 2;
  writeFileSync(ACTIVE_FILE, "1");
  writeFileSync(COUNT_FILE, "0");
  writeFileSync(CONFIG_FILE, JSON.stringify({ difficulty, every }));
  return `🏋️ Spotter is on. Difficulty: ${difficulty}. Trigger every ${every} code write(s).`;
}

function handleDeactivate() {
  const exercise = readJson(EXERCISE_FILE);
  if (exercise?.originalBranch) {
    try { git(exercise.cwd, "checkout", exercise.originalBranch); } catch {}
  }
  [ACTIVE_FILE, COUNT_FILE, EXERCISE_FILE].forEach(f => {
    try { writeFileSync(f, ""); } catch {}
  });
  return "Spotter is off. Back to normal.";
}

function handleExercise(args) {
  const { unit, filePath, scaffold, difficulty } = args;
  if (!unit || !filePath || !scaffold) {
    return { error: "unit, filePath, and scaffold are required." };
  }

  const cwd = args.cwd ?? process.cwd();
  const config = readJson(CONFIG_FILE) ?? { difficulty: "medium", every: 2 };
  const activeDifficulty = difficulty ?? config.difficulty;

  let originalBranch = "main";
  try { originalBranch = git(cwd, "branch", "--show-current"); } catch {}

  const safeName = unit.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const branchName = `spotter/${safeName}`;

  try { git(cwd, "checkout", "-b", branchName); }
  catch { git(cwd, "checkout", branchName); }

  writeFileSync(join(cwd, filePath), scaffold);
  git(cwd, "add", filePath);
  git(cwd, "commit", "-m", `spotter: scaffold ${unit}`);

  writeFileSync(EXERCISE_FILE, JSON.stringify({ unit, filePath, branch: branchName, originalBranch, difficulty: activeDifficulty, cwd }));
  writeFileSync(COUNT_FILE, "0");

  const label = { lite: "signature + structure provided — implement the body", medium: "signature provided — implement the logic", hard: "spec only — design and implement from scratch" }[activeDifficulty] ?? "";
  return [
    `🏋️ Exercise ready: **${unit}**`,
    `Difficulty: ${activeDifficulty} — ${label}`,
    `File: \`${filePath}\``,
    ``,
    `Edit the file. Replace the \`# SPOTTER:\` marker with your implementation.`,
    `When done: /spotter:done · Hint: /spotter:hint · Concede: /spotter:solve · Skip: /spotter:skip`,
  ].join("\n");
}

function handleStatus() {
  const active = existsSync(ACTIVE_FILE) && readFileSync(ACTIVE_FILE, "utf8").trim() === "1";
  const config = readJson(CONFIG_FILE) ?? { difficulty: "medium", every: 2 };
  const count = parseInt(readFileSync(COUNT_FILE, "utf8").trim() ?? "0") || 0;
  const exercise = readJson(EXERCISE_FILE);
  const lines = [
    `Spotter: ${active ? "🟢 on" : "⚪ off"}`,
    `Difficulty: ${config.difficulty}`,
    `Trigger every: ${config.every} code write(s)`,
    `Counter: ${count}/${config.every}`,
  ];
  if (exercise?.unit) lines.push(`Active exercise: ${exercise.unit} (${exercise.filePath})`);
  return lines.join("\n");
}

// ─── MCP JSON-RPC handler ────────────────────────────────────────────────────

const TOOL_DEF = {
  name: "spotter_exercise",
  description: "Manage Spotter gym-mode exercises. Use action='activate' to enable, 'deactivate' to disable, 'exercise' to scaffold a unit, 'status' to check state.",
  inputSchema: {
    type: "object",
    properties: {
      action: { type: "string", enum: ["activate", "deactivate", "exercise", "status"], description: "What to do" },
      unit: { type: "string", description: "Name of the unit (for action=exercise)" },
      filePath: { type: "string", description: "Relative path to file (for action=exercise)" },
      scaffold: { type: "string", description: "Scaffold code with # SPOTTER: marker (for action=exercise)" },
      difficulty: { type: "string", enum: ["lite", "medium", "hard"], description: "Difficulty level" },
      every: { type: "number", description: "Trigger every N code writes (for action=activate)" },
      cwd: { type: "string", description: "Working directory (for action=exercise); defaults to process.cwd()" },
    },
    required: ["action"],
  },
};

function respond(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
}

function respondError(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }) + "\n");
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on("line", (line) => {
  let req;
  try { req = JSON.parse(line); } catch { return; }

  const { id, method, params } = req;

  if (method === "initialize") {
    respond(id, { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "spotter", version: "0.1.0" } });
    return;
  }

  if (method === "tools/list") {
    respond(id, { tools: [TOOL_DEF] });
    return;
  }

  if (method === "tools/call") {
    const args = params?.arguments ?? {};
    let text;
    try {
      switch (args.action) {
        case "activate":   text = handleActivate(args); break;
        case "deactivate": text = handleDeactivate(); break;
        case "exercise":   text = handleExercise(args); break;
        case "status":     text = handleStatus(); break;
        default: text = `Unknown action: ${args.action}`;
      }
    } catch (e) {
      text = `Error: ${e.message}`;
    }
    const isError = typeof text === "object" && text.error;
    respond(id, {
      content: [{ type: "text", text: isError ? text.error : text }],
      isError: !!isError,
    });
    return;
  }

  respondError(id, -32601, `Method not found: ${method}`);
});
