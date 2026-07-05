import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// React Testing Library: unmount and clean the DOM between tests.
afterEach(() => {
  cleanup();
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
      localStorage.clear();
    }
  } catch {
    /* storage unavailable in this test — nothing to reset */
  }
});

// jsdom doesn't implement matchMedia (ColorModeContext reads prefers-color-scheme).
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

if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = vi.fn();
}
