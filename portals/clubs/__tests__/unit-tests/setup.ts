import * as matchers from '@testing-library/jest-dom/matchers';
import { afterEach, expect } from 'vitest';
import { cleanup } from '@testing-library/react';

// The '@testing-library/jest-dom/vitest' auto-extend is unreliable under this
// repo's portal configs; register the matchers explicitly instead.
expect.extend(matchers);

// React Testing Library: unmount and clean the DOM between tests.
afterEach(() => {
  cleanup();
});

// jsdom doesn't implement matchMedia (the shell's color-mode context reads it).
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
