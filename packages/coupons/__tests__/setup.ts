import { afterEach, expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
// The jsdom gaps AG Grid reaches for (object URLs, MouseEvent views, scroll,
// hit-testing). Shared with every table consumer rather than pasted (rule 40).
import '@duncit/table/test-setup';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

// AG Grid asks for matchMedia, which jsdom does not provide.
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

// jsdom reports zero dimensions; AG Grid virtualises everything away at width
// 0, so give every element a nominal size to make columns and rows render.
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
