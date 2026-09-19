import { afterEach } from 'vitest';
import { unmountAll } from '../dom';

// React's act() only flushes renders and effects when told it runs in a test.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

// Unmount every tree a test mounted, so no test can see another's DOM.
afterEach(async () => {
  await unmountAll();
  localStorage.clear();
});
