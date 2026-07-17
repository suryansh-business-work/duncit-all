import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect, vi } from 'vitest';

// The '@testing-library/jest-dom/vitest' auto-extend does not register here, so
// extend the expect matchers explicitly (repo-proven pattern).
expect.extend(matchers);

afterEach(() => {
  cleanup();
});

// jsdom doesn't implement matchMedia (MUI/theme reads prefers-color-scheme).
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

// jsdom doesn't implement Blob URLs; the invoice downloader creates one.
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = vi.fn(() => 'blob:mock');
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = vi.fn();
}
