// ─── Prompts tests ────────────────────────────────────────────────────────────

import { describe, expect, it } from 'bun:test';
import { PROMPTS, CLAUDE_PROMPTS, buildPrompts } from './prompts.js';

describe('buildPrompts', () => {
  it('replaces only the specified key when override provided', () => {
    const result = buildPrompts({ on: 'Custom ON prompt' });
    expect(result.ON).toBe('Custom ON prompt');
    expect(result.OFF).toBe(PROMPTS.OFF);
    expect(result.STATUS).toBe(PROMPTS.STATUS);
    expect(result.DONE).toBe(PROMPTS.DONE);
  });

  it('appends `all` suffix to every prompt', () => {
    const suffix = 'Always be concise.';
    const result = buildPrompts({ all: suffix });

    const keys = Object.keys(PROMPTS) as Array<keyof typeof PROMPTS>;
    for (const key of keys) {
      expect(result[key]).toContain(suffix);
      expect(result[key]).toContain(PROMPTS[key]);
    }
  });

  it('applies both per-key override and all suffix', () => {
    const result = buildPrompts({ on: 'Custom ON', all: 'SUFFIX' });
    expect(result.ON).toBe('Custom ON\nSUFFIX');
    expect(result.OFF).toBe(`${PROMPTS.OFF}\nSUFFIX`);
  });

  it('returns identical structure to PROMPTS when no overrides', () => {
    const result = buildPrompts();
    const keys = Object.keys(PROMPTS) as Array<keyof typeof PROMPTS>;
    for (const key of keys) {
      expect(result[key]).toBe(PROMPTS[key]);
    }
  });
});

describe('CLAUDE_PROMPTS', () => {
  it('contains mcp__spotme__ references', () => {
    expect(CLAUDE_PROMPTS.ON).toContain('mcp__spotme__');
    expect(CLAUDE_PROMPTS.OFF).toContain('mcp__spotme__');
    expect(CLAUDE_PROMPTS.STATUS).toContain('mcp__spotme__');
    expect(CLAUDE_PROMPTS.REP).toContain('mcp__spotme__');
    expect(CLAUDE_PROMPTS.DONE).toContain('mcp__spotme__');
    expect(CLAUDE_PROMPTS.HINT).toContain('mcp__spotme__');
    expect(CLAUDE_PROMPTS.SOLVE).toContain('mcp__spotme__');
    expect(CLAUDE_PROMPTS.SKIP).toContain('mcp__spotme__');
  });
});

describe('PROMPTS', () => {
  it('does not contain mcp__spotme__ references', () => {
    const keys = Object.keys(PROMPTS) as Array<keyof typeof PROMPTS>;
    for (const key of keys) {
      expect(PROMPTS[key]).not.toContain('mcp__spotme__');
    }
  });
});
