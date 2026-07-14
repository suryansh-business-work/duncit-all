import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// React Testing Library leaks DOM between tests in vitest's worker — clean up
// after every test so queries can't match a previous render's nodes.
afterEach(() => {
  cleanup();
});

// AG Grid (via @duncit/table) needs ResizeObserver + matchMedia, neither of
// which jsdom provides.
class ResizeObserverStub {
  observe(): void {
    // no-op — jsdom has no layout to observe
  }

  unobserve(): void {
    // no-op
  }

  disconnect(): void {
    // no-op
  }
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

if (typeof globalThis.matchMedia === 'undefined') {
  globalThis.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof globalThis.matchMedia;
}

// jsdom reports zero dimensions; AG Grid virtualises everything away at width 0,
// so give every element a nominal size to make columns/rows render.
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
