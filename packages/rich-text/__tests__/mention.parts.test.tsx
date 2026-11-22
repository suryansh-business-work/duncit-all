/**
 * The mention pieces on their own: the list anchors to the caret (or to the
 * editor box when the caret cannot be measured), and the suggestion hook does
 * nothing until a mention is actually being typed.
 */
import { describe, expect, it, vi } from 'vitest';
import type { Editor } from '@tiptap/react';

import { MentionMenu } from '../src/mention/MentionMenu';
import { useMentionSuggest } from '../src/mention/useMentionSuggest';
import type { RichTextMentions } from '../src/types';
import { flush, mount } from './harness';

const box = { x: 1, y: 2, top: 2, left: 1, right: 11, bottom: 12, width: 10, height: 10, toJSON: () => ({}) } as DOMRect;

const fakeEditor = (coordsAtPos: () => { left: number; top: number; bottom: number }) => {
  const dom = { getBoundingClientRect: vi.fn(() => box) };
  const editor = { view: { coordsAtPos: vi.fn(coordsAtPos), dom }, state: { selection: { from: 3 } }, on: vi.fn(), off: vi.fn() };
  return { editor: editor as unknown as Editor, view: editor.view, dom };
};

describe('MentionMenu', () => {
  it('anchors under the caret', async () => {
    const { editor, view, dom } = fakeEditor(() => ({ left: 40, top: 10, bottom: 30 }));
    await mount(<MentionMenu editor={editor} items={[{ id: 'a', label: 'Asha' }]} loading={false} active={0} onSelect={vi.fn()} />);
    await flush();

    expect(view.coordsAtPos).toHaveBeenCalledWith(3);
    expect(dom.getBoundingClientRect).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Asha');
  });

  it('falls back to the editor box when the caret cannot be measured', async () => {
    const { editor, dom } = fakeEditor(() => {
      throw new Error('no layout');
    });
    await mount(<MentionMenu editor={editor} items={[]} loading active={0} onSelect={vi.fn()} />);
    await flush();

    expect(dom.getBoundingClientRect).toHaveBeenCalled();
    expect(document.body.textContent).toContain('Searching…');
  });
});

describe('useMentionSuggest', () => {
  type Suggest = ReturnType<typeof useMentionSuggest>;
  const mentions: RichTextMentions = { search: vi.fn(async () => []) };

  function Probe({ editor, onReady }: Readonly<{ editor: Editor | null; onReady: (s: Suggest) => void }>) {
    onReady(useMentionSuggest(editor, mentions));
    return null;
  }

  it('is closed, ignores keys and picks nothing until a mention is being typed — with or without an editor', async () => {
    for (const editor of [null, fakeEditor(() => ({ left: 0, top: 0, bottom: 0 })).editor]) {
      let suggest: Suggest | null = null;
      await mount(
        <Probe
          editor={editor}
          onReady={(s) => {
            suggest = s;
          }}
        />,
      );
      const current = suggest as unknown as Suggest;
      expect(current.open).toBe(false);
      expect(current.items).toEqual([]);
      expect(current.onKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }))).toBe(false);
      expect(() => current.select({ id: 'a', label: 'Asha' })).not.toThrow();
      expect(mentions.search).not.toHaveBeenCalled();
    }
  });
});
