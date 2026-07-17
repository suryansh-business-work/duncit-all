import * as matchers from '@testing-library/jest-dom/matchers';
import { afterEach, expect, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// The '@testing-library/jest-dom/vitest' auto-extend is unreliable under this
// repo's vitest config; register the matchers explicitly instead.
expect.extend(matchers);

afterEach(() => {
  cleanup();
  // A few tests stub `localStorage`; guard the reset.
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
      localStorage.clear();
    }
  } catch {
    /* storage unavailable in this test — nothing to reset */
  }
});

// jsdom doesn't implement matchMedia (ColorModeProvider reads the
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

// jsdom elements have no scrollTo; some MUI views call it on refs.
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = vi.fn();
}

// Some MUI transitions / shell chrome need ResizeObserver, which jsdom lacks.
class ResizeObserverStub {
  observe(): void {
    /* no-op — jsdom has no layout to observe */
  }

  unobserve(): void {
    /* no-op */
  }

  disconnect(): void {
    /* no-op */
  }
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

// jsdom reports zero dimensions; give every element a nominal size so the
// GoogleSignInButton width-measurement branch and MUI layout code run.
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
