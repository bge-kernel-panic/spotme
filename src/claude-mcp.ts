#!/usr/bin/env node
// ─── Claude MCP server ───────────────────────────────────────────────────────
// Stdio MCP server exposing SpotMe tools for Claude Code.

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { access } from 'fs/promises';
import { join } from 'path';
import { SpotMeEngine } from './engine.js';
import type { Difficulty } from './types.js';

const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit']);

// ─── Project directory resolution ────────────────────────────────────────────

const projectDir =
  process.env.SPOTME_PROJECT_DIR ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

// ─── Engine setup ─────────────────────────────────────────────────────────────

const engine = new SpotMeEngine({
  platform: {
    resolvePath(rawPath) {
      const fullPath = rawPath.startsWith('/') ? rawPath : join(projectDir, rawPath);
      const relativePath = fullPath.startsWith(projectDir + '/')
        ? fullPath.slice(projectDir.length + 1)
        : rawPath;
      return { fullPath, relativePath };
    },
    async fileExists(fullPath) {
      try {
        await access(fullPath);
        return true;
      } catch {
        return false;
      }
    },
  },
  codeWriteTools: WRITE_TOOLS,
});

// ─── MCP server ───────────────────────────────────────────────────────────────

const server = new Server({ name: 'spotme', version: '1.0.0' }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'spotme_on',
      description: 'Activate SpotMe gym mode.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          args: { type: 'string', description: 'Raw args string, e.g. "hard --every 3"' },
        },
      },
    },
    {
      name: 'spotme_off',
      description: 'Deactivate SpotMe gym mode.',
      inputSchema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'spotme_status',
      description: 'Show current SpotMe session status.',
      inputSchema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'spotme_start_rep',
      description: 'Start an on-demand SpotMe exercise. Call BEFORE writing the scaffold.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          args: { type: 'string', description: 'Optional hint for the exercise topic' },
        },
      },
    },
    {
      name: 'spotme_exercise',
      description: 'Record the start of a SpotMe exercise. Call AFTER writing the scaffold file.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          unit: { type: 'string', description: 'Name of the unit being exercised' },
          filePath: { type: 'string', description: 'Path to the scaffold file' },
          difficulty: {
            type: 'string',
            enum: ['lite', 'medium', 'hard'],
            description: 'Exercise difficulty',
          },
        },
        required: ['unit', 'filePath', 'difficulty'],
      },
    },
    {
      name: 'spotme_end',
      description: 'Close the current SpotMe exercise.',
      inputSchema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'spotme_intercept_write',
      description: 'Hook called before Write/Edit/MultiEdit. Returns deny decision when blocking.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          tool_name: { type: 'string', description: 'Name of the intercepted tool' },
          tool_input: {
            type: 'object',
            description: 'Tool input payload (must contain file_path or path)',
            additionalProperties: true,
          },
        },
        required: ['tool_name', 'tool_input'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const a = (args ?? {}) as Record<string, unknown>;

  switch (name) {
    case 'spotme_on': {
      const result = engine.activateFromArgs((a.args as string | undefined) ?? '');
      return { content: [{ type: 'text' as const, text: result.message }] };
    }

    case 'spotme_off': {
      engine.deactivate();
      return { content: [{ type: 'text' as const, text: 'SpotMe deactivated.' }] };
    }

    case 'spotme_status': {
      return { content: [{ type: 'text' as const, text: engine.getStatus() }] };
    }

    case 'spotme_start_rep': {
      const result = engine.startRep((a.args as string | undefined) ?? '');
      return { content: [{ type: 'text' as const, text: result.message }] };
    }

    case 'spotme_exercise': {
      const difficulty = a.difficulty as string;
      if (difficulty !== 'lite' && difficulty !== 'medium' && difficulty !== 'hard') {
        throw new Error(`Invalid difficulty "${difficulty}". Must be lite, medium, or hard.`);
      }
      const result = await engine.recordExercise(
        a.unit as string,
        a.filePath as string,
        difficulty as Difficulty
      );
      return { content: [{ type: 'text' as const, text: result.message }] };
    }

    case 'spotme_end': {
      return { content: [{ type: 'text' as const, text: engine.endExercise() }] };
    }

    case 'spotme_intercept_write': {
      const toolName = (a.tool_name as string | undefined) ?? '';
      const toolInput = a.tool_input as { file_path?: string; path?: string } | undefined;
      const filePath = toolInput?.file_path ?? toolInput?.path ?? '';
      // eslint-disable-next-line no-console
      console.error(
        `[spotme] intercept tool=${toolName} file=${filePath} args=${JSON.stringify(a)}`
      );
      const result = engine.interceptWriteToolCall(toolName, filePath);
      if (result.blocked) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                hookSpecificOutput: {
                  hookEventName: 'PreToolUse',
                  permissionDecision: 'deny',
                  permissionDecisionReason: result.message,
                },
              }),
            },
          ],
        };
      }
      return { content: [] };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
