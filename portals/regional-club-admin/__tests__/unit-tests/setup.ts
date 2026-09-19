import '@duncit/table/test-setup';
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// React Testing Library leaks DOM between tests in vitest's worker — clean up
// after every test so queries can't match a previous render's nodes. The canvas
// keeps its orientation and viewport in localStorage, so that is reset too.
afterEach(() => {
  cleanup();
  try {
    localStorage.clear();
  } catch {
    /* a test stubbed storage away — nothing to reset */
  }
});

// jsdom has no matchMedia; the theme provider reads the prefers-color-scheme
// query through it. A plain no-match stub (not a mock) survives restoreAllMocks.
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
