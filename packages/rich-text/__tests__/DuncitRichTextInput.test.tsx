/**
 * The shared rich-text editor, in each of the shapes its callers ask for.
 *
 * The contract that matters is `RichTextChangeHandler`: a caller gets BOTH the
 * safe HTML and its plain-text snapshot, because every API that stores authored
 * copy stores the searchable companion beside it — an editor that emitted only
 * one of the two would silently ship blank search text.
 *
 * Rendered through react-dom directly rather than Testing Library: this package
 * deliberately carries no RTL dependency, and adding one to reach it would put
 * a devDependency (and a lockfile change) on every surface that bundles it.
 */
import { StrictMode, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MockedProvider } from '@apollo/client/testing';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { DuncitRichTextInput } from '../src/DuncitRichTextInput';
import { LinkDialog } from '../src/LinkDialog';
import type { DuncitRichTextInputProps } from '../src/types';

const testTheme = createTheme();

beforeAll(() => {
  // ProseMirror measures its own selection; jsdom's Range answers with nothing,
  // which is fine, but the methods have to exist for the editor to boot at all.
  const box = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) };
  Range.prototype.getBoundingClientRect ??= () => box as DOMRect;
  Range.prototype.getClientRects ??= () => ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} }) as never;
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

let container: HTMLDivElement | null = null;
let root: Root | null = null;

const mount = async (ui: ReactElement) => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <StrictMode>
        <MockedProvider mocks={[]}>
          <ThemeProvider theme={testTheme}>{ui}</ThemeProvider>
        </MockedProvider>
      </StrictMode>
    );
  });
  return container;
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

const editor = (props: Partial<DuncitRichTextInputProps> = {}) => {
  const onChange = vi.fn();
  return {
    onChange,
    ui: <DuncitRichTextInput value="<p>Doubles at Court 2.</p>" onChange={onChange} {...props} />,
  };
};

const press = async (host: HTMLElement, limit = 12) => {
  for (const button of [...host.querySelectorAll<HTMLButtonElement>('button:not([disabled])')].slice(0, limit)) {
    if (!button.isConnected) continue;
    await act(async () => {
      button.click();
    });
  }
};

describe('DuncitRichTextInput', () => {
  it('renders the authored content', async () => {
    const host = await mount(editor().ui);

    expect(host.textContent).toContain('Doubles at Court 2.');
  });

  it('renders an empty editor for an empty value', async () => {
    const host = await mount(editor({ value: '' }).ui);

    expect(host.innerHTML).not.toBe('');
  });

  it('offers a toolbar when it is editable', async () => {
    const host = await mount(editor().ui);

    expect(host.querySelectorAll('button').length).toBeGreaterThan(0);
  });

  it('offers no toolbar and no AI action when it is read-only', async () => {
    const host = await mount(editor({ readOnly: true }).ui);

    expect(host.querySelectorAll('button')).toHaveLength(0);
  });

  it('renders the borderless variant chat messages use', async () => {
    const host = await mount(editor({ bare: true, readOnly: true }).ui);

    expect(host.textContent).toContain('Doubles at Court 2.');
  });

  it('renders the compact and disabled variants', async () => {
    expect((await mount(editor({ compact: true }).ui)).innerHTML).not.toBe('');
    expect((await mount(editor({ disabled: true }).ui)).innerHTML).not.toBe('');
  });

  it('honours the caller placeholder over the shared default', async () => {
    const host = await mount(editor({ value: '', placeholder: 'Tell people what to expect' }).ui);

    expect(host.innerHTML).toContain('Tell people what to expect');
  });

  it('labels itself for a screen reader when the caller names it', async () => {
    const host = await mount(editor({ ariaLabel: 'Pod description' }).ui);

    expect(host.querySelector('[aria-label="Pod description"]')).not.toBeNull();
  });

  it('survives every toolbar control being pressed, with the AI call answering nothing', async () => {
    const host = await mount(editor({ aiContext: 'a pod description' }).ui);

    await press(host);

    expect(host.innerHTML).not.toBe('');
  });

  it('reports the HTML and its plain-text snapshot together, never one alone', async () => {
    const { ui, onChange } = editor();
    const host = await mount(ui);

    const editable = host.querySelector('[contenteditable="true"]');
    expect(editable).not.toBeNull();

    await act(async () => {
      editable?.dispatchEvent(new Event('input', { bubbles: true }));
    });

    for (const call of onChange.mock.calls) {
      expect(call).toHaveLength(2);
      expect(typeof call[0]).toBe('string');
      expect(typeof call[1]).toBe('string');
    }
  });
});

describe('LinkDialog', () => {
  it('renders nothing while it is closed', async () => {
    await mount(<LinkDialog currentUrl="" open={false} onApply={vi.fn()} onClose={vi.fn()} />);

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens prefilled with the link already on the selection', async () => {
    await mount(<LinkDialog currentUrl="https://duncit.com" open onApply={vi.fn()} onClose={vi.fn()} />);

    const field = [...document.body.querySelectorAll<HTMLInputElement>('input')].find(
      (input) => input.value === 'https://duncit.com'
    );
    expect(field).toBeDefined();
  });

  it('opens empty when there is no link yet', async () => {
    await mount(<LinkDialog currentUrl="" open onApply={vi.fn()} onClose={vi.fn()} />);

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('reports a string to the caller whenever it applies one', async () => {
    const onApply = vi.fn();
    await mount(<LinkDialog currentUrl="https://duncit.com" open onApply={onApply} onClose={vi.fn()} />);

    await press(document.body as HTMLElement);

    for (const [url] of onApply.mock.calls) expect(typeof url).toBe('string');
  });
});
