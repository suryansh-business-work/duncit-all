/**
 * @mentions: typing "@" opens a list of people, the keyboard and the mouse
 * both pick one, and the pick is stored as a mention node an API can read
 * (`<span data-type="mention" data-id="…">`). Saved mentions render in a
 * read-only document too, and nothing opens where mentioning is off.
 */
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Editor } from '@tiptap/react';

import { DuncitRichTextInput } from '../src/DuncitRichTextInput';
import { mentionQueryBefore } from '../src/mention/mentionQuery';
import type { RichTextMentionItem, RichTextMentions } from '../src/types';
import { flush, keyDown, mount, rerender } from './harness';

const PRIYA: RichTextMentionItem = { id: '64b7f0c2a1b2c3d4e5f60718', label: 'Priya', description: 'priya@duncit.test' };
const AMIT: RichTextMentionItem = { id: '64b7f0c2a1b2c3d4e5f60719', label: 'Amit' };

const mentionsOf = (people: RichTextMentionItem[] = [PRIYA, AMIT]): RichTextMentions => ({
  search: vi.fn(async (query: string) => people.filter((p) => p.label.toLowerCase().startsWith(query.toLowerCase()))),
});

/** Tiptap hangs its editor on the ProseMirror element; the tests drive it the way typing would. */
const editorIn = (host: HTMLElement): Editor => {
  const dom = host.querySelector('.ProseMirror') as (HTMLElement & { editor?: Editor }) | null;
  if (!dom?.editor) throw new Error('no editor');
  return dom.editor;
};

const type = async (editor: Editor, text: string) => {
  await act(async () => {
    editor.commands.insertContent(text);
  });
  await flush();
};

const list = () => document.body.querySelector<HTMLElement>('[data-testid="rich-text-mention-list"]');
const options = () => [...(list()?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];

const setup = async (mentions: RichTextMentions = mentionsOf(), value = '<p></p>') => {
  const onChange = vi.fn();
  const host = await mount(<DuncitRichTextInput value={value} onChange={onChange} mentions={mentions} />);
  const editor = editorIn(host);
  await act(async () => {
    editor.commands.focus('end');
  });
  return { host, editor, onChange, dom: host.querySelector('.ProseMirror') as HTMLElement };
};

describe('mentionQueryBefore', () => {
  it('finds the fragment after an "@" at the start or after a space, and nothing inside an email address', () => {
    expect(mentionQueryBefore('@')).toBe('');
    expect(mentionQueryBefore('Call @pri')).toBe('pri');
    expect(mentionQueryBefore('mail me at me@duncit')).toBeNull();
    expect(mentionQueryBefore('@pri ya')).toBeNull();
    expect(mentionQueryBefore(`@${'a'.repeat(41)}`)).toBeNull();
    expect(mentionQueryBefore('')).toBeNull();
  });
});

describe('DuncitRichTextInput · @mentions', () => {
  it('opens the list on "@", narrows it as the name is typed, and picks with Enter', async () => {
    const mentions = mentionsOf();
    const { editor, dom, onChange } = await setup(mentions);

    await type(editor, 'Call @');
    expect(mentions.search).toHaveBeenLastCalledWith('');
    expect(options().map((o) => o.textContent)).toEqual(['Priyapriya@duncit.test', 'Amit']);
    expect(options()[0].getAttribute('aria-selected')).toBe('true');

    await type(editor, 'pr');
    expect(mentions.search).toHaveBeenLastCalledWith('pr');
    expect(options()).toHaveLength(1);

    await keyDown(dom, 'Enter');
    await flush();

    expect(list()).toBeNull();
    const html = editor.getHTML();
    expect(html).toContain('data-type="mention"');
    expect(html).toContain(`data-id="${PRIYA.id}"`);
    expect(html).toContain('data-label="Priya"');
    expect(editor.getText()).toContain('Call @Priya');
    expect(onChange).toHaveBeenLastCalledWith(expect.stringContaining('data-type="mention"'), expect.stringContaining('@Priya'));
  });

  it('moves through the list with the arrow keys, wrapping, and picks with Tab', async () => {
    const { editor, dom } = await setup();
    await type(editor, '@');

    await keyDown(dom, 'ArrowDown');
    expect(options()[1].getAttribute('aria-selected')).toBe('true');
    await keyDown(dom, 'ArrowDown');
    expect(options()[0].getAttribute('aria-selected')).toBe('true');
    await keyDown(dom, 'ArrowUp');
    expect(options()[1].getAttribute('aria-selected')).toBe('true');
    // A key the list does not own goes to the editor and leaves the list open.
    await keyDown(dom, 'ArrowLeft');
    expect(list()).not.toBeNull();

    await keyDown(dom, 'Tab');
    await flush();
    expect(editor.getHTML()).toContain(`data-id="${AMIT.id}"`);
  });

  it('picks with the mouse without losing the caret', async () => {
    const { editor } = await setup();
    await type(editor, '@am');

    const [amit] = options();
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    await act(async () => {
      amit.dispatchEvent(event);
    });
    await flush();

    expect(event.defaultPrevented).toBe(true);
    expect(editor.getHTML()).toContain(`data-id="${AMIT.id}"`);
  });

  it('closes on Escape and stays closed for that "@" until a new one is typed', async () => {
    const { editor, dom } = await setup();
    await type(editor, '@p');

    await keyDown(dom, 'Escape');
    expect(list()).toBeNull();
    await type(editor, 'r');
    expect(list()).toBeNull();

    await type(editor, ' @');
    expect(list()).not.toBeNull();
  });

  it('says it is searching while it waits, then that nobody matches, and lets Enter through to the editor', async () => {
    let answer: (people: RichTextMentionItem[]) => void = () => undefined;
    const slow: RichTextMentions = {
      search: vi.fn(
        () =>
          new Promise<readonly RichTextMentionItem[]>((resolve) => {
            answer = resolve;
          }),
      ),
    };
    const { editor, dom } = await setup(slow);
    await type(editor, '@zz');
    expect(list()?.textContent).toBe('Searching…');

    await act(async () => {
      answer([]);
    });
    await flush();
    expect(list()?.textContent).toBe('No one matches that name');
    // With nobody to pick, Enter is not the list's: the editor gets it and starts a new line, which ends the "@zz".
    await keyDown(dom, 'Enter');
    await flush();
    expect(editor.getHTML()).toBe('<p>@zz</p><p></p>');
    expect(list()).toBeNull();
  });

  it('shows no one when the search fails', async () => {
    const failing: RichTextMentions = { search: vi.fn(async () => Promise.reject(new Error('offline'))) };
    const { editor } = await setup(failing);
    await type(editor, '@p');
    expect(list()?.textContent).toBe('No one matches that name');
  });

  it('ignores an answer that arrives after the name changed, success or failure', async () => {
    const pending: Array<{ resolve: (p: RichTextMentionItem[]) => void; reject: (e: Error) => void }> = [];
    const racing: RichTextMentions = {
      search: vi.fn(
        () =>
          new Promise<readonly RichTextMentionItem[]>((resolve, reject) => {
            pending.push({ resolve, reject });
          }),
      ),
    };
    const { editor } = await setup(racing);
    await type(editor, '@p');
    await type(editor, 'r');
    await type(editor, 'i');
    expect(pending).toHaveLength(3);

    await act(async () => {
      pending[0].resolve([AMIT]);
      pending[1].reject(new Error('late'));
      pending[2].resolve([PRIYA]);
    });
    await flush();

    expect(options().map((o) => o.textContent)).toEqual(['Priyapriya@duncit.test']);
  });

  it('does not open for a selection, or once the editor turns read-only', async () => {
    const mentions = mentionsOf();
    const { editor } = await setup(mentions, '<p>Hello @pri</p>');
    await act(async () => {
      editor.commands.selectAll();
    });
    await flush();
    expect(list()).toBeNull();

    await act(async () => {
      editor.commands.focus('end');
    });
    await flush();
    expect(list()).not.toBeNull();

    await rerender(<DuncitRichTextInput value="<p>Hello @pri</p>" onChange={vi.fn()} mentions={mentions} readOnly />);
    await flush();
    expect(list()).toBeNull();
  });

  it('renders saved mentions, with or without their attributes, in a read-only document', async () => {
    const host = await mount(
      <DuncitRichTextInput
        value={`<p>Ask <span data-type="mention" data-id="${PRIYA.id}" data-label="Priya">@Priya</span> and <span data-type="mention">@x</span></p>`}
        onChange={vi.fn()}
        readOnly
      />,
    );
    const spans = host.querySelectorAll('span[data-type="mention"]');
    expect(spans).toHaveLength(2);
    expect(spans[0].textContent).toBe('@Priya');
    expect(spans[0].classList.contains('rich-text-mention')).toBe(true);
    expect(spans[1].getAttribute('data-id')).toBe('');
    expect(spans[1].textContent).toBe('@');
  });

  it('treats "@" as plain text, and Enter as a new line, where mentioning is off', async () => {
    const host = await mount(<DuncitRichTextInput value="<p></p>" onChange={vi.fn()} />);
    const editor = editorIn(host);
    await act(async () => {
      editor.commands.focus('end');
    });
    await type(editor, 'mail @pri');
    expect(list()).toBeNull();

    await keyDown(host.querySelector('.ProseMirror') as HTMLElement, 'Enter');
    await flush();
    expect(editor.getHTML()).toBe('<p>mail @pri</p><p></p>');
  });

  it('writes a mention inserted with missing attributes as empty ones', async () => {
    const { editor } = await setup(mentionsOf(), '<p></p>');
    await act(async () => {
      editor.commands.insertContent({ type: 'mention', attrs: { id: null, label: null } });
    });
    expect(editor.getHTML()).toContain('data-id="" data-label=""');
    expect(editor.getText()).toContain('@');
  });
});
