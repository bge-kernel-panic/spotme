// ─── Installer tests ──────────────────────────────────────────────────────────

import { describe, expect, it } from 'bun:test';
import { generateArtifacts } from './installer/artifacts.js';
import { applyEdits, modify, parseTree, findNodeAtLocation } from 'jsonc-parser/lib/esm/main.js';

// ─── generateArtifacts ────────────────────────────────────────────────────────

const ARTIFACT_OPTS = {
  packageVersion: '1.1.0',
  pluginRoot: '/home/user/.spotme/claude-marketplace',
  mcpJsPath: '/home/user/.spotme/claude-marketplace/plugins/spotme/dist/claude-mcp.js',
};

describe('generateArtifacts', () => {
  it('produces the expected set of file keys', () => {
    const { files } = generateArtifacts(ARTIFACT_OPTS);
    const keys = Object.keys(files);

    expect(keys).toContain('.claude-plugin/marketplace.json');
    expect(keys).toContain('plugins/spotme/.claude-plugin/plugin.json');
    expect(keys).toContain('plugins/spotme/.mcp.json');
    expect(keys).toContain('plugins/spotme/hooks/hooks.json');

    const skillNames = ['on', 'off', 'status', 'rep', 'done', 'hint', 'solve', 'skip'];
    for (const name of skillNames) {
      expect(keys).toContain(`plugins/spotme/skills/${name}/SKILL.md`);
    }
  });

  it('plugin.json version matches <version>-local.<digits> pattern', () => {
    const { files } = generateArtifacts(ARTIFACT_OPTS);
    const pluginJson = JSON.parse(files['plugins/spotme/.claude-plugin/plugin.json']) as {
      version: string;
    };
    expect(pluginJson.version).toMatch(/^1\.1\.0-local\.\d+$/);
  });

  it('.mcp.json contains CLAUDE_PLUGIN_ROOT placeholder', () => {
    const { files } = generateArtifacts(ARTIFACT_OPTS);
    const mcpJson = files['plugins/spotme/.mcp.json'];
    expect(mcpJson).toContain('${CLAUDE_PLUGIN_ROOT}');
  });

  it('.mcp.json contains CLAUDE_PROJECT_DIR placeholder', () => {
    const { files } = generateArtifacts(ARTIFACT_OPTS);
    const mcpJson = files['plugins/spotme/.mcp.json'];
    expect(mcpJson).toContain('${CLAUDE_PROJECT_DIR}');
  });

  it('hooks.json matches expected structure', () => {
    const { files } = generateArtifacts(ARTIFACT_OPTS);
    const hooks = JSON.parse(files['plugins/spotme/hooks/hooks.json']) as {
      hooks: {
        PreToolUse: Array<{
          matcher: string;
          hooks: Array<{ type: string; server: string; tool: string }>;
        }>;
      };
    };

    expect(hooks.hooks.PreToolUse).toHaveLength(1);
    const entry = hooks.hooks.PreToolUse[0];
    expect(entry.matcher).toBe('Write|Edit|MultiEdit');
    expect(entry.hooks[0].type).toBe('mcp_tool');
    expect(entry.hooks[0].server).toBe('plugin:spotme:spotme');
    expect(entry.hooks[0].tool).toBe('spotme_intercept_write');
  });

  it('skill files contain correct frontmatter', () => {
    const { files } = generateArtifacts(ARTIFACT_OPTS);
    const onSkill = files['plugins/spotme/skills/on/SKILL.md'];
    expect(onSkill).toContain('name: spotme:on');
    expect(onSkill).toContain('user-invocable: true');
    expect(onSkill).toContain('disable-model-invocation: true');
    expect(onSkill).toContain('mcp__plugin_spotme_spotme__spotme_on');
  });
});

// ─── OpenCode jsonc-parser mutation ───────────────────────────────────────────

function addSpotmeToPlugins(source: string): string {
  const tree = parseTree(source);

  if (tree) {
    const pluginsNode = findNodeAtLocation(tree, ['plugins']);
    if (pluginsNode?.type === 'array' && pluginsNode.children) {
      const alreadyPresent = pluginsNode.children.some(
        (child) => child.type === 'string' && child.value === 'spotme'
      );
      if (alreadyPresent) return source;
    }
  }

  const existing = source.trim() === '' ? '{}' : source;
  const edits = modify(existing, ['plugins', -1], 'spotme', { formattingOptions: {} });
  return applyEdits(existing, edits);
}

describe('OpenCode jsonc mutation', () => {
  it('adds spotme to empty plugins array', () => {
    const result = addSpotmeToPlugins('{}');
    const parsed = JSON.parse(result) as { plugins?: string[] };
    expect(parsed.plugins).toContain('spotme');
  });

  it('adds spotme to existing plugins array', () => {
    const result = addSpotmeToPlugins(JSON.stringify({ plugins: ['other'] }));
    const parsed = JSON.parse(result) as { plugins?: string[] };
    expect(parsed.plugins).toContain('spotme');
    expect(parsed.plugins).toContain('other');
  });

  it('is a no-op if spotme already present', () => {
    const input = JSON.stringify({ plugins: ['spotme'] });
    const result = addSpotmeToPlugins(input);
    expect(result).toBe(input);
  });

  it('creates plugins array when not present', () => {
    const result = addSpotmeToPlugins(JSON.stringify({ tools: [] }));
    const parsed = JSON.parse(result) as { plugins?: string[]; tools?: unknown[] };
    expect(parsed.plugins).toContain('spotme');
    expect(parsed.tools).toEqual([]);
  });
});
