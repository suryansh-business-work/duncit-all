import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// React Testing Library: unmount and clean the DOM between tests.
afterEach(() => {
  cleanup();
  // A few tests stub `localStorage` with a partial object; guard the reset.
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
      localStorage.clear();
    }
  } catch {
    /* storage unavailable in this test — nothing to reset */
  }
});

// jsdom doesn't implement matchMedia (ColorModeContext reads the
// prefers-color-scheme query). Provide a plain (non-mock) no-match stub so it
// survives `vi.restoreAllMocks()` calls inside individual tests.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

// jsdom elements have no scrollTo; chat/ticket views call it on refs.
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = vi.fn();
}
