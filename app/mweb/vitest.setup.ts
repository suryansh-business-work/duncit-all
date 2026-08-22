import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

/**
 * The parts of a browser jsdom does not implement.
 *
 * Each one is here because a suite was failing on it: mWeb downloads tickets
 * and invoices (object URLs), opens share targets in a new tab
 * (`window.open`), draws charts and QR codes (canvas), scrolls its rails, and
 * renders MUI surfaces that read `prefers-color-scheme` and measure
 * themselves. jsdom throws on all of it, so the suite died before asserting.
 */

if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = vi.fn(() => 'blob:mock');
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = vi.fn();
}

// "Not implemented: window.open" is thrown, not returned.
window.open = vi.fn();

if (!HTMLCanvasElement.prototype.getContext) {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;
}

globalThis.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
})) as typeof globalThis.matchMedia;

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

globalThis.ResizeObserver ??= ResizeObserverStub;

// Carousels and the virtual-scroll rails observe visibility.
class IntersectionObserverStub {
  observe(): void {
    // no-op
  }

  unobserve(): void {
    // no-op
  }

  disconnect(): void {
    // no-op
  }

  takeRecords(): [] {
    return [];
  }
}

globalThis.IntersectionObserver ??= IntersectionObserverStub as never;

if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = vi.fn();
}
globalThis.scrollTo ??= vi.fn() as never;
