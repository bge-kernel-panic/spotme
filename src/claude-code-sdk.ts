// Claude Code SDK adapter
// Docs: https://code.claude.com/docs/en/agent-sdk/plugins
//
// Usage:
//   import { createSpotterIntegration } from "./claude-code-sdk.js";
//   const spotter = createSpotterIntegration("./my-project");
//   for await (const msg of query({ prompt: "...", options: spotter.queryOptions() })) { ... }
//
// Note: requires @anthropic-ai/claude-agent-sdk (verify exact package name on npm before installing)
// Tool names in Claude Code use the format: mcp__spotter__spotter_exercise

import { exec } from "child_process";
import { promisify } from "util";
import { writeFile } from "fs/promises";
import { join } from "path";
import {
  type Difficulty,
  type SpotterState,
  makeState,
  parseArgs,
  exerciseReadyMessage,
  donePrompt,
  HINT_PROMPT,
  SOLVE_PROMPT,
  SKIP_PROMPT,
} from "./core.js";

const execAsync = promisify(exec);

async function git(cwd: string, ...args: string[]): Promise<string> {
  const { stdout } = await execAsync(`git ${args.join(" ")}`, { cwd });
  return stdout.trim();
}

// Claude Code built-in code-writing tool names (title-cased, unlike OpenCode/Pi)
const CC_CODE_WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit"]);

export interface SpotterOptions {
  every?: number;
  difficulty?: Difficulty;
}

export interface ClaudeCodeIntegration {
  state: SpotterState;
  // Returns options to spread into query() calls
  queryOptions(): {
    mcpServers: Record<string, unknown>;
    hooks: {
      PreToolUse: Array<{ matcher: string; hooks: unknown[] }>;
      PostToolUse: Array<{ matcher: string; hooks: unknown[] }>;
    };
    allowedTools?: string[];
  };
}

export function createSpotterIntegration(
  directory: string,
  options?: SpotterOptions
): ClaudeCodeIntegration {
  const state: SpotterState = {
    ...makeState(),
    every: options?.every ?? 2,
    difficulty: options?.difficulty ?? "medium",
  };

  // ─── MCP tool: spotter_exercise ────────────────────────────────────────────
  // In-process MCP server via Agent SDK createSdkMcpServer
  // (the SDK's tool() helper and createSdkMcpServer are imported at runtime —
  //  we keep this file importable without the SDK for type-checking purposes)

  async function handleSpotterExercise(args: {
    action?: "activate" | "deactivate" | "exercise";
    unit?: string;
    filePath?: string;
    scaffold?: string;
    difficulty?: string;
    every?: number;
  }) {
    // Activation (called by /spotter:on skill)
    if (args.action === "activate") {
      state.enabled = true;
      if (args.difficulty) state.difficulty = args.difficulty as Difficulty;
      if (args.every) state.every = args.every;
      state.counter = 0;
      state.exercise = null;
      return {
        content: [{
          type: "text" as const,
          text: `🏋️ Spotter is on. Difficulty: ${state.difficulty}. Trigger every ${state.every} code write(s).`,
        }],
      };
    }

    // Deactivation (called by /spotter:off skill)
    if (args.action === "deactivate") {
      state.enabled = false;
      state.exercise = null;
      state.counter = 0;
      return {
        content: [{ type: "text" as const, text: "Spotter is off. Write code normally." }],
      };
    }

    // Exercise setup (the core flow)
    const { unit, filePath, scaffold, difficulty } = args;
    if (!unit || !filePath || !scaffold) {
      return {
        content: [{ type: "text" as const, text: "Error: unit, filePath, and scaffold are required." }],
        isError: true,
      };
    }

    let originalBranch: string;
    try { originalBranch = await git(directory, "branch", "--show-current"); }
    catch { originalBranch = "main"; }

    const safeName = unit.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const branchName = `spotter/${safeName}`;

    try { await git(directory, "checkout", "-b", branchName); }
    catch { await git(directory, "checkout", branchName); }

    await writeFile(join(directory, filePath), scaffold ?? "", "utf8");
    await git(directory, "add", filePath);
    await git(directory, "commit", "-m", `spotter: scaffold ${unit}`);

    state.exercise = {
      active: true,
      unit,
      filePath,
      branch: branchName,
      originalBranch,
      difficulty: (difficulty ?? state.difficulty) as Difficulty,
    };
    state.counter = 0;

    return {
      content: [{
        type: "text" as const,
        text: exerciseReadyMessage(unit, filePath, state.exercise.difficulty),
      }],
    };
  }

  // ─── Hook callbacks ────────────────────────────────────────────────────────

  // PreToolUse: count code writes, block at threshold
  async function preToolHook(input: { tool_name?: string; hook_event_name?: string }) {
    if (!state.enabled || state.exercise?.active) return {};
    const toolName = input.tool_name ?? "";
    if (!CC_CODE_WRITE_TOOLS.has(toolName)) return {};

    state.counter++;
    const { counter, every, difficulty } = state;

    if (counter >= every) {
      state.counter = 0;
      return {
        hookSpecificOutput: {
          hookEventName: input.hook_event_name ?? "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason:
            `[Spotter] Code-write limit reached (${counter}/${every}). ` +
            `Call mcp__spotter__spotter_exercise to scaffold the next unit ` +
            `(difficulty: ${difficulty}) instead of writing directly. ` +
            `Or run /spotter:rep to request an exercise.`,
        },
      };
    }

    return {
      systemMessage: `[Spotter] Code write ${counter}/${every}.`,
    };
  }

  // PostToolUse: cleanup after done/solve/skip MCP calls
  async function postToolHook(input: { tool_name?: string }) {
    // If exercise was just concluded via MCP (deactivate action), switch branches back
    if (input.tool_name === "mcp__spotter__spotter_exercise" && !state.exercise) {
      // Branch cleanup already handled in the tool handler
      return {};
    }
    return {};
  }

  // ─── Cleanup helper (for /spotter:done, /spotter:solve, /spotter:skip) ───
  // Called by the skill prompts indirectly through the MCP tool
  async function concludeExercise(): Promise<string> {
    if (!state.exercise) return "(no active exercise)";

    let diff = "";
    try { diff = await git(directory, "diff", "HEAD"); }
    catch { diff = "(no diff available)"; }

    const orig = state.exercise.originalBranch;
    state.exercise = null;
    state.counter = 0;

    try { await git(directory, "checkout", orig); } catch { /* non-fatal */ }

    return diff;
  }

  // ─── Return integration ────────────────────────────────────────────────────

  return {
    state,

    queryOptions() {
      // These hooks match Claude Code Agent SDK hook format.
      // Pass this object into query() options when using the SDK programmatically.
      return {
        mcpServers: {
          // The SDK's createSdkMcpServer() call would go here.
          // We expose the raw handler so callers can wrap it with the SDK:
          //   const server = createSdkMcpServer({ name: "spotter", tools: [spotterExerciseTool] })
          // See README for full SDK wiring example.
          spotter: { __handler: handleSpotterExercise, __concludeExercise: concludeExercise },
        },
        hooks: {
          PreToolUse: [
            {
              matcher: "Write|Edit|MultiEdit",
              hooks: [preToolHook],
            },
          ],
          PostToolUse: [
            {
              matcher: "mcp__spotter__spotter_exercise",
              hooks: [postToolHook],
            },
          ],
        },
        allowedTools: ["mcp__spotter__spotter_exercise"],
      };
    },
  };
}

// ─── Prompt helpers (for use in Stop hooks or custom review flows) ───────────
export { donePrompt, HINT_PROMPT, SOLVE_PROMPT, SKIP_PROMPT };
