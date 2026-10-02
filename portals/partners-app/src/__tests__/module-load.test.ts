/**
 * Module-load smoke: every module under `src/` is imported once, each in its
 * own test so one broken module cannot hide the rest.
 *
 * This is a real check, not a coverage trick. Top-level code — gql documents,
 * column definitions, option maps, theme objects, zod schemas, styled
 * components — runs at import time, and a circular import, a missing export or
 * a throw up there is otherwise only ever discovered by a browser opening the
 * page. Nothing else in this workspace's suite loads most of these files at
 * all.
 *
 * Entry points (`main.tsx`) and the test files themselves are excluded: one
 * bootstraps a real React root, and the others register their suites on import.
 */
import { describe, expect, it } from 'vitest';

const modules = import.meta.glob([
  '../**/*.{ts,tsx}',
  '!../**/*.d.ts',
  '!../**/main.tsx',
  '!../**/__tests__/**',
  '!../**/__mocks__/**',
  '!../**/*.{test,spec}.{ts,tsx}',
  '!../**/*.cy.{ts,tsx}',
]);

const paths = Object.keys(modules).sort((a, b) => a.localeCompare(b));

// The first import in a file transforms its whole graph cold (apollo.ts pulls
// in the client and the shell); on a busy CI runner that alone outran 5s.
const MODULE_LOAD_TIMEOUT_MS = 30_000;

describe('every module loads', () => {
  it('has modules to load — an empty glob would make the suite below vacuous', () => {
    expect(paths.length).toBeGreaterThan(0);
  });

  it.each(paths)('loads %s', async (modulePath) => {
    const load = modules[modulePath] as () => Promise<Record<string, unknown>>;

    await expect(load()).resolves.toBeDefined();
  }, MODULE_LOAD_TIMEOUT_MS);
});
