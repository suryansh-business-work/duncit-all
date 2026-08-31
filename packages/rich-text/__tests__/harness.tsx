/**
 * Shared DOM harness for this package's suites.
 *
 * Rendered through react-dom directly rather than Testing Library: this package
 * deliberately carries no RTL dependency, and adding one to reach it would put
 * a devDependency (and a lockfile change) on every surface that bundles it.
 * Every suite that mounts a component imports `mount` from here, so the shims
 * ProseMirror needs, the providers, and the per-test unmount live in ONE place.
 */
import { StrictMode, act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { afterEach, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ProseMirror measures its own selection; jsdom's Range answers with nothing,
// which is fine, but the methods have to exist for the editor to boot at all.
const box = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) };
Range.prototype.getBoundingClientRect ??= () => box as DOMRect;
Range.prototype.getClientRects ??= () =>
  ({
    length: 0,
    item: () => null,
    [Symbol.iterator]: function* () {},
  }) as never;
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// Zero-length transitions: a closed MUI Dialog leaves the DOM after one timer
// tick (see `flush`) instead of a wall-clock fade the test would have to wait out.
const zero = { shortest: 0, shorter: 0, short: 0, standard: 0, complex: 0, enteringScreen: 0, leavingScreen: 0 };
export const testTheme = createTheme({ transitions: { duration: zero } });

let container: HTMLDivElement | null = null;
let root: Root | null = null;

const wrap = (ui: ReactElement, mocks: readonly MockedResponse[]) => (
  <StrictMode>
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <ThemeProvider theme={testTheme}>{ui}</ThemeProvider>
    </MockedProvider>
  </StrictMode>
);

/** Mount `ui` under the providers every component here expects; returns the host element. */
export const mount = async (ui: ReactElement, mocks: readonly MockedResponse[] = []) => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(wrap(ui, mocks));
  });
  return container;
};

/** Render a new element into the SAME root, the way a parent re-rendering with new props does. */
export const rerender = async (ui: ReactElement, mocks: readonly MockedResponse[] = []) => {
  await act(async () => {
    root?.render(wrap(ui, mocks));
  });
};

afterEach(async () => {
  await act(async () => {
    root?.unmount();
  });
  container?.remove();
  root = null;
  container = null;
  vi.clearAllMocks();
});

/** Let one macrotask pass inside act — Apollo's MockLink and MUI's transitions both answer on a timer. */
export const flush = async (ticks = 2) => {
  for (let i = 0; i < ticks; i += 1) {
    await act(async () => {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      });
    });
  }
};

export const click = async (element: Element | null) => {
  if (!(element instanceof HTMLElement)) throw new Error('nothing to click');
  await act(async () => {
    element.click();
  });
};

/** Click every enabled button under `host`, in DOM order, up to `limit`. */
export const pressAll = async (host: HTMLElement, limit = 12) => {
  for (const button of [...host.querySelectorAll<HTMLButtonElement>('button:not([disabled])')].slice(0, limit)) {
    if (!button.isConnected) continue;
    await click(button);
  }
};

/** Type into a controlled input the way a browser does: native setter, then the `input` event React listens for. */
export const setInputValue = async (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  await act(async () => {
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

export const keyDown = async (element: Element, key: string) => {
  await act(async () => {
    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key }));
  });
};

export const buttonNamed = (scope: ParentNode, name: string) =>
  scope.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`);

/** Dialog action buttons carry their name as visible text, not as an aria-label. */
export const buttonWithText = (scope: ParentNode, text: string) =>
  [...scope.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === text) ??
  null;

export const dialog = () => document.body.querySelector<HTMLElement>('[role="dialog"]');

export const dialogInput = () => {
  const input = dialog()?.querySelector<HTMLInputElement>('input');
  if (!input) throw new Error('the link dialog is not open');
  return input;
};
