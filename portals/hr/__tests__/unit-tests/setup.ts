import * as matchers from '@testing-library/jest-dom/matchers';
import { afterEach, expect, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// The '@testing-library/jest-dom/vitest' auto-extend is unreliable under this
// portal's config; register the matchers explicitly instead.
expect.extend(matchers);

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

// jsdom elements have no scrollTo; some MUI/table views call it on refs.
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = vi.fn();
}

// jsdom reports zero dimensions; the Google button effect reads clientWidth to
// size itself, so give every element a nominal size.
const DIMENSIONS: Record<string, number> = {
  offsetWidth: 800,
  offsetHeight: 600,
  clientWidth: 800,
  clientHeight: 600,
};
for (const [property, value] of Object.entries(DIMENSIONS)) {
  Object.defineProperty(globalThis.HTMLElement.prototype, property, {
    configurable: true,
    get: () => value,
  });
}
