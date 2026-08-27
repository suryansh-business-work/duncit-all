/**
 * The toolbar against a real (headless) tiptap editor, so every button is
 * checked by what it did to the document rather than by whether it rendered.
 * The editor is prepared BEFORE the toolbar mounts: mounted on its own the
 * toolbar reads `editor.can()` / `isActive()` once, so the state each test
 * needs (a link under the cursor, history to walk) has to be there already.
 */
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RichTextToolbar } from '../src/RichTextToolbar';
import { buttonNamed, buttonWithText, click, dialog, dialogInput, flush, mount, setInputValue } from './harness';

const editors: Editor[] = [];

const editorWith = (content: string) => {
  const editor = new Editor({
    content,
    extensions: [StarterKit, Underline, Link.configure({ openOnClick: false })],
  });
  editors.push(editor);
  return editor;
};

afterEach(() => {
  for (const editor of editors.splice(0)) editor.destroy();
});

const toolbar = (editor: Editor) => <RichTextToolbar compact={false} editor={editor} />;

describe('RichTextToolbar', () => {
  it('removes the link under the cursor', async () => {
    const editor = editorWith('<p><a href="https://duncit.com">Court 2</a> details</p>');
    editor.commands.setTextSelection(3);
    expect(editor.isActive('link')).toBe(true);
    const host = await mount(toolbar(editor));

    await click(buttonNamed(host, 'Remove link'));

    expect(editor.isActive('link')).toBe(false);
    expect(editor.getHTML()).toBe('<p>Court 2 details</p>');
  });

  it('walks the history both ways', async () => {
    const editor = editorWith('<p>Doubles</p>');
    // The history plugin groups edits made within ~500ms into ONE undo step;
    // pin the clock so each insert lands far enough apart to be its own step.
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000);
    editor.commands.insertContentAt(8, ' at Court 2');
    now.mockReturnValue(60_000);
    editor.commands.insertContentAt(19, ', 7 pm');
    now.mockRestore();
    editor.commands.undo();
    expect(editor.getText()).toBe('Doubles at Court 2');
    const host = await mount(toolbar(editor));

    await click(buttonNamed(host, 'Redo'));
    expect(editor.getText()).toBe('Doubles at Court 2, 7 pm');

    await click(buttonNamed(host, 'Undo'));
    expect(editor.getText()).toBe('Doubles at Court 2');
  });

  it('keeps the editor selection on mousedown, so a click formats what was selected', async () => {
    const host = await mount(toolbar(editorWith('<p>Doubles</p>')));
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });

    buttonNamed(host, 'Bold')?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('links the selection to the URL applied in the dialog', async () => {
    const editor = editorWith('<p>Court 2 details</p>');
    editor.commands.setTextSelection({ from: 1, to: 8 });
    const host = await mount(toolbar(editor));

    await click(buttonNamed(host, 'Add link'));
    await setInputValue(dialogInput(), 'https://duncit.com/pods/DUN-POD-4821');
    await click(buttonWithText(document.body, 'Apply link'));
    await flush();

    expect(editor.getHTML()).toBe(
      '<p><a target="_blank" rel="noopener noreferrer nofollow" href="https://duncit.com/pods/DUN-POD-4821">Court 2</a> details</p>',
    );
    expect(dialog()).toBeNull();
  });

  it('closes the dialog on Cancel without touching the document', async () => {
    const editor = editorWith('<p>Court 2 details</p>');
    const host = await mount(toolbar(editor));

    await click(buttonNamed(host, 'Add link'));
    expect(dialog()).not.toBeNull();
    await click(buttonWithText(document.body, 'Cancel'));
    await flush();

    expect(dialog()).toBeNull();
    expect(editor.getHTML()).toBe('<p>Court 2 details</p>');
  });
});
