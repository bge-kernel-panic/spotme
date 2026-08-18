// ─── Engine tests ─────────────────────────────────────────────────────────────

import { describe, expect, it } from 'bun:test';
import { SpotMeEngine } from './engine.js';
import type { PlatformAdapter } from './engine.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePlatform(
  files: Map<string, string> = new Map(),
  ignored: Set<string> = new Set()
): PlatformAdapter {
  return {
    resolvePath(rawPath) {
      return { fullPath: rawPath, relativePath: rawPath };
    },
    async fileExists(fullPath) {
      return files.has(fullPath);
    },
    async readFile(fullPath) {
      return files.get(fullPath) ?? '';
    },
    async writeFile(fullPath, content) {
      files.set(fullPath, content);
    },
    async isIgnored(fullPath) {
      return ignored.has(fullPath);
    },
  };
}

function makeEngine(
  opts: {
    codeWriteTools?: Set<string>;
    existingFiles?: Map<string, string>;
    ignored?: Set<string>;
  } = {}
): SpotMeEngine {
  return new SpotMeEngine({
    platform: makePlatform(opts.existingFiles, opts.ignored),
    codeWriteTools: opts.codeWriteTools ?? new Set(['write', 'edit']),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('codeWriteTools', () => {
  it('does not count tools outside the configured set', async () => {
    const engine = makeEngine({ codeWriteTools: new Set(['write']) });
    engine.activate();

    const result = await engine.interceptWriteToolCall('edit', 'foo.ts');
    expect(result.blocked).toBe(false);
    expect(engine.state.counter).toBe(0);
  });

  it('counts only tools in the configured set', async () => {
    const engine = makeEngine({ codeWriteTools: new Set(['write']) });
    engine.activate({ every: 2 });

    await engine.interceptWriteToolCall('write', 'a.ts');
    expect(engine.state.counter).toBe(1);

    await engine.interceptWriteToolCall('edit', 'b.ts');
    expect(engine.state.counter).toBe(1); // edit not counted
  });
});

describe('startRep', () => {
  it('sets exercisePending to true without changing counter', async () => {
    const engine = makeEngine();
    engine.activate({ every: 5 });
    await engine.interceptWriteToolCall('write', 'a.ts');
    expect(engine.state.counter).toBe(1);

    engine.startRep();

    expect(engine.state.counter).toBe(1); // counter unchanged
  });

  it('allows next write through without counting (repBypassNext)', async () => {
    const engine = makeEngine();
    engine.activate({ every: 2 });

    engine.startRep();

    const result = await engine.interceptWriteToolCall('write', 'scaffold.ts');
    expect(result.blocked).toBe(false);
    // Bypass does not increment the counter — scaffold writes don't count
    expect(engine.state.counter).toBe(0);
  });

  it('includes hint in message when args provided', async () => {
    const engine = makeEngine();
    engine.activate();
    const result = engine.startRep('binary search');
    expect(result.message).toContain('Hint: binary search.');
  });

  it('omits hint line when args is empty', async () => {
    const engine = makeEngine();
    engine.activate();
    const result = engine.startRep('');
    expect(result.message).not.toContain('Hint:');
    expect(result.message).toContain('[SpotMe] On-demand rep started.');
  });
});

describe('repBypassNext one-shot', () => {
  it('second write after startRep + endExercise is counted normally', async () => {
    const engine = makeEngine({ existingFiles: new Map([['/tmp/scaffold.ts', '']]) });
    engine.activate({ every: 3 });

    engine.startRep();

    // First write uses the bypass — counter stays at 0
    await engine.interceptWriteToolCall('write', '/tmp/scaffold.ts');
    expect(engine.state.counter).toBe(0);

    // recordExercise clears exercisePending, counter reset to 0
    await engine.recordExercise('Test.unit', '/tmp/scaffold.ts', 'medium');
    engine.endExercise();

    // After exercise is closed, writes should be counted again
    await engine.interceptWriteToolCall('write', 'other.ts');
    expect(engine.state.counter).toBe(1);
  });
});

describe('endExercise', () => {
  it('clears exercise, counter, pending, and repBypassNext', async () => {
    const engine = makeEngine({ existingFiles: new Map([['/tmp/scaffold.ts', '']]) });
    engine.activate();
    engine.startRep();

    // Use bypass to simulate scaffold write
    await engine.interceptWriteToolCall('write', 'scaffold.ts');

    await engine.recordExercise('Test.unit', '/tmp/scaffold.ts', 'medium');

    engine.endExercise();

    expect(engine.state.exercise).toBeNull();
    expect(engine.state.counter).toBe(0);

    // After endExercise, writes should be counted (no bypass active)
    await engine.interceptWriteToolCall('write', 'a.ts');
    expect(engine.state.counter).toBe(1);
  });
});

describe('exercise-file protection + concede', () => {
  async function withActiveExercise(
    content = 'function f() {\n  // SPOTME: implement me\n}',
    opts: { ignored?: Set<string> } = {}
  ) {
    const files = new Map([['ex.ts', content]]);
    const engine = makeEngine({ existingFiles: files, ignored: opts.ignored });
    engine.activate({ every: 1 });
    engine.startRep(); // sets exercisePending + repBypassNext
    await engine.interceptWriteToolCall('write', 'ex.ts'); // scaffold write (bypass)
    await engine.recordExercise('f', 'ex.ts', 'medium'); // exercise now active
    return { engine, files };
  }

  it('blocks writes to a marker-bearing file while the exercise is active', async () => {
    const { engine } = await withActiveExercise();
    const result = await engine.interceptWriteToolCall('write', 'ex.ts');
    expect(result.blocked).toBe(true);
  });

  it('allows writes to other files during an active exercise', async () => {
    const { engine } = await withActiveExercise();
    const result = await engine.interceptWriteToolCall('write', 'unrelated.ts');
    expect(result.blocked).toBe(false);
  });

  it('does not treat the bare token in a string literal as a marker (known ext)', async () => {
    const { engine } = await withActiveExercise('const label = "SPOTME";\n');
    const result = await engine.interceptWriteToolCall('write', 'ex.ts');
    expect(result.blocked).toBe(false);
  });

  it('skips gitignored files (does not block)', async () => {
    const { engine } = await withActiveExercise('// SPOTME: implement me', {
      ignored: new Set(['ex.ts']),
    });
    const result = await engine.interceptWriteToolCall('write', 'ex.ts');
    expect(result.blocked).toBe(false);
  });

  it('concede strips the marker so the file becomes writable', async () => {
    const { engine, files } = await withActiveExercise();

    await engine.concede();
    expect(files.get('ex.ts')).not.toContain('SPOTME');

    const result = await engine.interceptWriteToolCall('write', 'ex.ts');
    expect(result.blocked).toBe(false);
  });
});

describe('deactivate', () => {
  it('clears all transient state', async () => {
    const engine = makeEngine();
    engine.activate();
    engine.startRep();

    engine.deactivate();

    expect(engine.state.enabled).toBe(false);
    expect(engine.state.exercise).toBeNull();
    expect(engine.state.counter).toBe(0);

    // Reactivate and verify nothing leaks
    engine.activate({ every: 2 });
    const result = await engine.interceptWriteToolCall('write', 'foo.ts');
    expect(result.blocked).toBe(false);
    expect(engine.state.counter).toBe(1);
  });
});
