// ─── Engine tests ─────────────────────────────────────────────────────────────

import { describe, expect, it } from 'bun:test';
import { SpotMeEngine } from './engine.js';
import type { PlatformAdapter } from './engine.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePlatform(files: Set<string> = new Set()): PlatformAdapter {
  return {
    resolvePath(rawPath) {
      return { fullPath: rawPath, relativePath: rawPath };
    },
    async fileExists(fullPath) {
      return files.has(fullPath);
    },
  };
}

function makeEngine(
  opts: { codeWriteTools?: Set<string>; existingFiles?: Set<string> } = {}
): SpotMeEngine {
  return new SpotMeEngine({
    platform: makePlatform(opts.existingFiles),
    codeWriteTools: opts.codeWriteTools ?? new Set(['write', 'edit']),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('codeWriteTools', () => {
  it('does not count tools outside the configured set', () => {
    const engine = makeEngine({ codeWriteTools: new Set(['write']) });
    engine.activate();

    const result = engine.interceptWriteToolCall('edit', 'foo.ts');
    expect(result.blocked).toBe(false);
    expect(engine.state.counter).toBe(0);
  });

  it('counts only tools in the configured set', () => {
    const engine = makeEngine({ codeWriteTools: new Set(['write']) });
    engine.activate({ every: 2 });

    engine.interceptWriteToolCall('write', 'a.ts');
    expect(engine.state.counter).toBe(1);

    engine.interceptWriteToolCall('edit', 'b.ts');
    expect(engine.state.counter).toBe(1); // edit not counted
  });
});

describe('startRep', () => {
  it('sets exercisePending to true without changing counter', () => {
    const engine = makeEngine();
    engine.activate({ every: 5 });
    engine.interceptWriteToolCall('write', 'a.ts');
    expect(engine.state.counter).toBe(1);

    engine.startRep();

    expect(engine.state.counter).toBe(1); // counter unchanged
  });

  it('allows next write through without counting (repBypassNext)', () => {
    const engine = makeEngine();
    engine.activate({ every: 2 });

    engine.startRep();

    const result = engine.interceptWriteToolCall('write', 'scaffold.ts');
    expect(result.blocked).toBe(false);
    // Bypass does not increment the counter — scaffold writes don't count
    expect(engine.state.counter).toBe(0);
  });

  it('includes hint in message when args provided', () => {
    const engine = makeEngine();
    engine.activate();
    const result = engine.startRep('binary search');
    expect(result.message).toContain('Hint: binary search.');
  });

  it('omits hint line when args is empty', () => {
    const engine = makeEngine();
    engine.activate();
    const result = engine.startRep('');
    expect(result.message).not.toContain('Hint:');
    expect(result.message).toContain('[SpotMe] On-demand rep started.');
  });
});

describe('repBypassNext one-shot', () => {
  it('second write after startRep + endExercise is counted normally', async () => {
    const engine = makeEngine({ existingFiles: new Set(['/tmp/scaffold.ts']) });
    engine.activate({ every: 3 });

    engine.startRep();

    // First write uses the bypass — counter stays at 0
    engine.interceptWriteToolCall('write', '/tmp/scaffold.ts');
    expect(engine.state.counter).toBe(0);

    // recordExercise clears exercisePending, counter reset to 0
    await engine.recordExercise('Test.unit', '/tmp/scaffold.ts', 'medium');
    engine.endExercise();

    // After exercise is closed, writes should be counted again
    engine.interceptWriteToolCall('write', 'other.ts');
    expect(engine.state.counter).toBe(1);
  });
});

describe('endExercise', () => {
  it('clears exercise, counter, pending, and repBypassNext', async () => {
    const engine = makeEngine({ existingFiles: new Set(['/tmp/scaffold.ts']) });
    engine.activate();
    engine.startRep();

    // Use bypass to simulate scaffold write
    engine.interceptWriteToolCall('write', 'scaffold.ts');

    await engine.recordExercise('Test.unit', '/tmp/scaffold.ts', 'medium');

    engine.endExercise();

    expect(engine.state.exercise).toBeNull();
    expect(engine.state.counter).toBe(0);

    // After endExercise, writes should be counted (no bypass active)
    engine.interceptWriteToolCall('write', 'a.ts');
    expect(engine.state.counter).toBe(1);
  });
});

describe('deactivate', () => {
  it('clears all transient state', () => {
    const engine = makeEngine();
    engine.activate();
    engine.startRep();

    engine.deactivate();

    expect(engine.state.enabled).toBe(false);
    expect(engine.state.exercise).toBeNull();
    expect(engine.state.counter).toBe(0);

    // Reactivate and verify nothing leaks
    engine.activate({ every: 2 });
    const result = engine.interceptWriteToolCall('write', 'foo.ts');
    expect(result.blocked).toBe(false);
    expect(engine.state.counter).toBe(1);
  });
});
