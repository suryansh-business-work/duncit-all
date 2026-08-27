/**
 * The AI improvement action and the controlled-value contract.
 *
 * "Improve with AI" replaces the document with what the server sends back and
 * reports it through the SAME `onChange` as typing does — a caller never has to
 * know which of the two produced the value it stores.
 */
import type { MockedResponse } from '@apollo/client/testing';
import { describe, expect, it, vi } from 'vitest';

import { DuncitRichTextInput } from '../src/DuncitRichTextInput';
import { IMPROVE_RICH_TEXT } from '../src/operations';
import { buttonNamed, click, flush, mount, rerender } from './harness';

const AUTHORED = '<p>Doubles at Court 2.</p>';

const answer = (html: string, context: string | null, aiImproveRichText: string | null): MockedResponse => ({
  request: { query: IMPROVE_RICH_TEXT, variables: { input: { html, context } } },
  result: { data: { aiImproveRichText } },
});

const improve = (host: HTMLElement) => click(buttonNamed(host, 'Improve with AI'));

describe('DuncitRichTextInput · Improve with AI', () => {
  it('replaces the document with the improved copy and reports HTML + text through onChange', async () => {
    const onChange = vi.fn();
    const host = await mount(
      <DuncitRichTextInput value={AUTHORED} onChange={onChange} aiContext="a pod description" />,
      [answer(AUTHORED, 'a pod description', '  <p>Doubles at Court 2, 7 pm sharp.</p>  ')],
    );

    await improve(host);
    await flush();

    expect(host.textContent).toContain('Doubles at Court 2, 7 pm sharp.');
    expect(onChange).toHaveBeenLastCalledWith(
      '<p>Doubles at Court 2, 7 pm sharp.</p>',
      'Doubles at Court 2, 7 pm sharp.',
    );
    expect(host.querySelector('[role="alert"]')).toBeNull();
  });

  it('sends a null context when the caller gave none, and shows the error when AI answers blank', async () => {
    const onChange = vi.fn();
    const host = await mount(<DuncitRichTextInput value={AUTHORED} onChange={onChange} />, [
      answer(AUTHORED, null, '   '),
    ]);

    // Mounting echoes the initial value once through onChange (tiptap's
    // setEditable emits an update); the action under test must add nothing.
    onChange.mockClear();
    await improve(host);
    await flush();

    expect(host.querySelector('[role="alert"]')?.textContent).toContain('AI could not improve this text');
    expect(host.textContent).toContain('Doubles at Court 2.');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows the error when the mutation answers with no data at all', async () => {
    const host = await mount(<DuncitRichTextInput value={AUTHORED} onChange={vi.fn()} />, [
      { request: { query: IMPROVE_RICH_TEXT, variables: { input: { html: AUTHORED, context: null } } }, result: {} },
    ]);

    await improve(host);
    await flush();

    expect(host.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('shows the error when the request fails, and clears it on the next attempt', async () => {
    const host = await mount(<DuncitRichTextInput value={AUTHORED} onChange={vi.fn()} />, [
      { request: { query: IMPROVE_RICH_TEXT, variables: { input: { html: AUTHORED, context: null } } }, error: new Error('offline') },
      answer(AUTHORED, null, '<p>Doubles at Court 2, Indiranagar.</p>'),
    ]);

    await improve(host);
    await flush();
    expect(host.querySelector('[role="alert"]')).not.toBeNull();

    await improve(host);
    await flush();
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(host.textContent).toContain('Indiranagar');
  });

  it('is unavailable while the document is empty', async () => {
    const host = await mount(<DuncitRichTextInput value="" onChange={vi.fn()} />);

    expect(buttonNamed(host, 'Improve with AI')?.disabled).toBe(true);
  });
});

describe('DuncitRichTextInput · controlled value', () => {
  it('follows a new value from the caller without echoing it back through onChange', async () => {
    const onChange = vi.fn();
    const host = await mount(<DuncitRichTextInput value={AUTHORED} onChange={onChange} />);

    // Mount-time echo aside (see above), following a caller's value is silent.
    onChange.mockClear();
    await rerender(<DuncitRichTextInput value="<p>Singles at Court 5.</p>" onChange={onChange} />);

    expect(host.textContent).toContain('Singles at Court 5.');
    expect(host.textContent).not.toContain('Doubles');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('empties the editor when the caller clears the value', async () => {
    const onChange = vi.fn();
    const host = await mount(<DuncitRichTextInput value={AUTHORED} onChange={onChange} />);

    await rerender(<DuncitRichTextInput value="" onChange={onChange} />);

    expect(host.querySelector('.ProseMirror')?.textContent).toBe('');
  });
});
