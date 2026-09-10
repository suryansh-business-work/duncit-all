/**
 * The table menu against a real (headless) tiptap editor with the table nodes
 * registered, so each action is judged by what it did to the document.
 *
 * The actions are also driven straight off the exported list rather than by
 * opening the menu eleven times: what matters is that every entry maps to a
 * command the schema actually has — a typo there is silent, the menu item just
 * does nothing.
 */
import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import { afterEach, describe, expect, it } from 'vitest';

import { TABLE_MENU_ACTIONS, TableMenu } from '../src/TableMenu';
import { buttonNamed, click, flush, mount } from './harness';

const editors: Editor[] = [];

const editorWith = (content: string) => {
  const editor = new Editor({ content, extensions: [StarterKit, TableKit] });
  editors.push(editor);
  return editor;
};

afterEach(() => {
  for (const editor of editors.splice(0)) editor.destroy();
});

/** A 2x2 with a header row, caret placed in the first body cell. */
const inTable = () => {
  const editor = editorWith(
    '<table><tbody><tr><th>Pod</th><th>Spots</th></tr><tr><td>DUN-POD-4821</td><td>8</td></tr></tbody></table>'
  );
  editor.commands.setTextSelection(12);
  return editor;
};

const count = (html: string, tag: string) => html.split(`<${tag}`).length - 1;

const menuItem = (name: string) =>
  [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
    (item) => item.textContent?.trim() === name
  ) ?? null;

const run = (editor: Editor, key: string) => {
  const action = TABLE_MENU_ACTIONS.find((entry) => entry.key === key);
  if (!action) throw new Error(`no table action named ${key}`);
  return action.run(editor);
};

describe('TableMenu', () => {
  it('inserts a 3x3 with a header row from an empty paragraph', async () => {
    const editor = editorWith('<p></p>');
    const host = await mount(<TableMenu editor={editor} />);

    await click(buttonNamed(host, 'Table'));
    await flush();
    await click(menuItem('Insert table'));

    const html = editor.getHTML();
    expect(count(html, 'tr')).toBe(3);
    expect(count(html, 'th')).toBe(3);
    expect(count(html, 'td')).toBe(6);
  });

  it('closes the menu once an action has run', async () => {
    const host = await mount(<TableMenu editor={inTable()} />);

    await click(buttonNamed(host, 'Table'));
    await flush();
    expect(menuItem('Delete row')).not.toBeNull();

    await click(menuItem('Delete row'));
    await flush();

    expect(menuItem('Delete row')).toBeNull();
  });

  it('offers the row and column actions only inside a table', async () => {
    const host = await mount(<TableMenu editor={editorWith('<p>Doubles at Court 2</p>')} />);

    await click(buttonNamed(host, 'Table'));
    await flush();

    expect(menuItem('Insert table')?.getAttribute('aria-disabled')).toBeNull();
    expect(menuItem('Delete table')?.getAttribute('aria-disabled')).toBe('true');
  });

  it('marks the button active while the caret sits in a table', async () => {
    const host = await mount(<TableMenu editor={inTable()} />);

    expect(buttonNamed(host, 'Table')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('adds and removes rows', () => {
    const editor = inTable();

    expect(run(editor, 'tableAddRowBefore')).toBe(true);
    expect(run(editor, 'tableAddRowAfter')).toBe(true);
    expect(count(editor.getHTML(), 'tr')).toBe(4);

    expect(run(editor, 'tableDeleteRow')).toBe(true);
    expect(count(editor.getHTML(), 'tr')).toBe(3);
  });

  it('adds and removes columns', () => {
    const editor = inTable();

    expect(run(editor, 'tableAddColumnBefore')).toBe(true);
    expect(run(editor, 'tableAddColumnAfter')).toBe(true);
    expect(count(editor.getHTML(), 'th')).toBe(4);

    expect(run(editor, 'tableDeleteColumn')).toBe(true);
    expect(count(editor.getHTML(), 'th')).toBe(3);
  });

  it('turns the header row into a body row and back', () => {
    const editor = inTable();

    expect(run(editor, 'tableToggleHeaderRow')).toBe(true);
    expect(count(editor.getHTML(), 'th')).toBe(0);

    expect(run(editor, 'tableToggleHeaderRow')).toBe(true);
    expect(count(editor.getHTML(), 'th')).toBe(2);
  });

  it('splits a merged cell back into two', () => {
    const editor = editorWith(
      '<table><tbody><tr><td colspan="2">DUN-POD-4821</td></tr><tr><td>8</td><td>₹499</td></tr></tbody></table>'
    );
    editor.commands.setTextSelection(4);

    expect(run(editor, 'tableMergeOrSplit')).toBe(true);
    expect(editor.getHTML()).not.toContain('colspan="2"');
  });

  it('deletes the whole table', () => {
    const editor = inTable();

    expect(run(editor, 'tableDelete')).toBe(true);
    expect(editor.getHTML()).not.toContain('<table');
  });

  it('inserts a table through the action list too', () => {
    const editor = editorWith('<p></p>');

    expect(run(editor, 'tableInsert')).toBe(true);
    expect(count(editor.getHTML(), 'tr')).toBe(3);
  });
});
