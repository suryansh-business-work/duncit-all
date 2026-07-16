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

if (globalThis.ResizeObserver === undefined) {
  globalThis.ResizeObserver = ResizeObserverStub;
}

if (globalThis.matchMedia === undefined) {
  globalThis.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  });
}

// jsdom reports zero dimensions; AG Grid virtualises everything away at width 0,
// so give every element a size wide enough that no table column is skipped.
const DIMENSIONS: Record<string, number> = {
  offsetWidth: 4000,
  offsetHeight: 2000,
  clientWidth: 4000,
  clientHeight: 2000,
};
for (const [property, value] of Object.entries(DIMENSIONS)) {
  Object.defineProperty(globalThis.HTMLElement.prototype, property, {
    configurable: true,
    get: () => value,
  });
}
