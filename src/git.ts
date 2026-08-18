// ─── Git helpers ────────────────────────────────────────────────────────────

import { execFile } from 'node:child_process';

// A file's ignore status is stable for a session, so memoize to avoid respawning
// git for the same path. Keyed by cwd + path; ponytail: stale if .gitignore is
// edited mid-session, which is not worth invalidating for.
const cache = new Map<string, Promise<boolean>>();

/**
 * True if `fullPath` is ignored by git, resolved from `cwd`. Fails open
 * (returns false) when git is missing or the path isn't inside a repo — we'd
 * rather scan a file than wrongly skip protecting one.
 */
export function gitIgnored(cwd: string, fullPath: string): Promise<boolean> {
  const key = `${cwd}\0${fullPath}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const result = new Promise<boolean>((resolve) => {
    // `check-ignore -q` exits 0 when ignored, 1 when not, 128 on error.
    execFile('git', ['check-ignore', '-q', fullPath], { cwd }, (err) => resolve(err == null));
  });
  cache.set(key, result);
  return result;
}
