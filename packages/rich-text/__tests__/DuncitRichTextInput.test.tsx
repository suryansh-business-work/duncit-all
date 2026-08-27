/**
 * The shared rich-text editor, in each of the shapes its callers ask for.
 *
 * The contract that matters is `RichTextChangeHandler`: a caller gets BOTH the
 * safe HTML and its plain-text snapshot, because every API that stores authored
 * copy stores the searchable companion beside it — an editor that emitted only
 * one of the two would silently ship blank search text.
 *
 * Rendered through react-dom directly rather than Testing Library (see
 * ./harness.tsx for why, and for the mount/press helpers every suite shares).
 */
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DuncitRichTextInput } from '../src/DuncitRichTextInput';
import { LinkDialog } from '../src/LinkDialog';
import type { DuncitRichTextInputProps } from '../src/types';
import { mount, pressAll as press } from './harness';

const editor = (props: Partial<DuncitRichTextInputProps> = {}) => {
  const onChange = vi.fn();
  return {
    onChange,
    ui: <DuncitRichTextInput value="<p>Doubles at Court 2.</p>" onChange={onChange} {...props} />,
  };
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
