import '@duncit/table/test-setup';
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

/**
 * The parts of a browser jsdom does not implement.
 *
 * Every one of these is here because a suite was failing on it, not
 * speculatively: admin screens download invoices and exports (object URLs),
 * open a preview in a new tab (`window.open`), draw QR codes and charts
 * (canvas), and render MUI surfaces that read `prefers-color-scheme` and
 * measure themselves. jsdom throws on all of it, which killed the suite before
 * a single assertion ran.
 */

// Blob downloads: the export/invoice helpers create and revoke object URLs.
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = vi.fn(() => 'blob:mock');
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = vi.fn();
}

// "Not implemented: window.open" is thrown, not returned, so it fails the test.
window.open = vi.fn();

// Chart and QR components ask for a 2D context; jsdom needs the `canvas`
// package to answer and we do not ship it, so hand back a no-op surface.
if (!HTMLCanvasElement.prototype.getContext) {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;
}

// MUI reads prefers-color-scheme through matchMedia.
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

// AG Grid (via @duncit/table) observes its container for resizes.
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

// jsdom elements have no scrollTo; MUI menus and the table call it on refs.
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = vi.fn();
}
