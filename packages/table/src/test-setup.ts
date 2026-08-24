/**
 * The browser jsdom does not have, for the parts AG Grid reaches for.
 *
 * This lives with the table because the table is what brings AG Grid in: every
 * one of these gaps is a call the grid makes, and each was found the same way —
 * a suite that had nothing to do with downloads or layout dying inside the
 * grid's code, taking the whole file's coverage with it. Fifteen portals render
 * `<DuncitTable>`, and the same block was being pasted into fifteen setup files
 * (rule 40).
 *
 * Import it once, first, from a workspace's vitest setup:
 *
 *     import '@duncit/table/test-setup';
 *
 * Nothing here fakes behaviour a test could assert on. Every one is a no-op or
 * a placeholder standing in for something jsdom has no implementation of.
 */

/**
 * Blob downloads. `_downloadFile` asks for an object URL for the CSV it just
 * built; jsdom has no object-URL store at all.
 */
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => 'blob:duncit-test';
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = () => undefined;
}

/**
 * The click that starts that download.
 *
 * AG Grid dispatches `new MouseEvent('click', { view: document.defaultView })`
 * on a hidden anchor, and jsdom refuses the view — "member view is not of type
 * Window" — which throws out of the render and fails the test. The event is a
 * file download: there is nothing in it to assert, and no test in this repo
 * reads a MouseEvent's `view`. So the view is dropped when jsdom will not take
 * it, and kept when it will.
 */
const NativeMouseEvent = globalThis.MouseEvent;

class ViewSafeMouseEvent extends NativeMouseEvent {
  constructor(type: string, init: MouseEventInit = {}) {
    try {
      super(type, init);
    } catch {
      super(type, { ...init, view: undefined });
    }
  }
}

globalThis.MouseEvent = ViewSafeMouseEvent as typeof globalThis.MouseEvent;

/** The grid observes its container for resizes; jsdom has no layout to observe. */
class NoopResizeObserver {
  observe(): void {
    /* jsdom never resizes */
  }

  unobserve(): void {
    /* jsdom never resizes */
  }

  disconnect(): void {
    /* jsdom never resizes */
  }
}

globalThis.ResizeObserver ??= NoopResizeObserver as unknown as typeof globalThis.ResizeObserver;

/** Cell navigation scrolls the viewport to the focused row. */
Element.prototype.scrollTo ??= function scrollTo(): void {
  /* jsdom has no scroll position */
};
Element.prototype.scrollIntoView ??= function scrollIntoView(): void {
  /* jsdom has no scroll position */
};

/** Column drag and the context menu hit-test the point under the pointer. */
document.elementFromPoint ??= function elementFromPoint(): Element | null {
  return null;
};
