import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

/**
 * A small render harness on react-dom itself.
 *
 * This workspace does not declare @testing-library/react (its siblings do), so
 * the suites mount through `createRoot` inside React's own `act` — the same
 * thing RTL does underneath — and query the DOM directly.
 */

const roots: Root[] = [];

export interface Mounted {
  container: HTMLElement;
  rerender: (next: ReactElement) => Promise<void>;
}

export async function mount(ui: ReactElement): Promise<Mounted> {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  await act(async () => {
    root.render(ui);
  });
  return {
    container,
    rerender: (next) =>
      act(async () => {
        root.render(next);
      }),
  };
}

export async function unmountAll(): Promise<void> {
  for (const root of roots.splice(0)) {
    await act(async () => {
      root.unmount();
    });
  }
  document.body.replaceChildren();
}

/** Lets pending promises land — Apollo's mocked link, a table's fetch. */
export const settle = (ms = 0) =>
  act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  });

export const click = (element: Element) =>
  act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

/** Types into a React-controlled input the way a browser does. */
export const typeInto = (input: HTMLInputElement, value: string) =>
  act(async () => {
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setValue?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

export const queryTestId = (id: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-testid="${id}"]`);

export function byTestId(id: string, root: ParentNode = document): HTMLElement {
  const found = queryTestId(id, root);
  if (!found) throw new Error(`no element with data-testid "${id}"`);
  return found;
}

/** Polls `check` until it stops throwing, letting React flush between tries. */
export async function waitUntil(check: () => void, timeout = 3000): Promise<void> {
  const started = Date.now();
  for (;;) {
    try {
      check();
      return;
    } catch (error) {
      if (Date.now() - started > timeout) throw error;
      await settle(20);
    }
  }
}
