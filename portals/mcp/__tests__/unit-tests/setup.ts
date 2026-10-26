import '@duncit/table/test-setup';
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// React's act() only flushes renders and effects when told it runs in a test.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Testing Library leaks DOM between tests in vitest's worker — clean up after
// every test so a query can never match the previous render's nodes.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  try {
    localStorage.clear();
  } catch {
    /* storage unavailable in this test — nothing to reset */
  }
});

// jsdom has no matchMedia; the theme reads the prefers-color-scheme query
// through it. A plain no-match stub (not a mock) survives restoreAllMocks.
globalThis.matchMedia ??= (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
});
