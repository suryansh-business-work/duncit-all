import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// jsdom ships no ResizeObserver; GridStack.init constructs one unconditionally
// (gridstack.ts _updateResizeEvent), and a throw inside that passive effect
// makes React 19 unmount the whole tree. A no-op observer keeps the grid
// mounted; the real resize behaviour is covered by the portals' e2e runs.
class NoopResizeObserver {
  observe(): void {
    // Intentionally empty: jsdom never resizes anything.
  }

  unobserve(): void {
    // Intentionally empty: nothing was ever observed.
  }

  disconnect(): void {
    // Intentionally empty: nothing to tear down.
  }
}

if (globalThis.ResizeObserver === undefined) {
  (globalThis as Record<string, unknown>).ResizeObserver = NoopResizeObserver;
}

afterEach(cleanup);
