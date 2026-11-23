import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { RichTextMentionItem, RichTextMentions } from '../types';
import { MENTION_NODE } from './mentionNode';
import { mentionQueryBefore } from './mentionQuery';

/** The "@fragment" the caret is in: its text and the document range it covers. */
export interface MentionQuery {
  query: string;
  from: number;
  to: number;
}

const EMPTY: readonly RichTextMentionItem[] = [];

/** The key handler of an editor with mentioning off: every key is the editor's. */
export const ignoreKeys = (event: KeyboardEvent): boolean => event.defaultPrevented;

/** The mention being typed at a collapsed caret, or null. */
export function readMentionQuery(editor: Editor): MentionQuery | null {
  const { selection } = editor.state;
  if (!selection.empty) return null;
  const { $from } = selection;
  // Leaf nodes (an earlier mention, a picture) read as one object character, never as text.
  const before = $from.parent.textBetween(0, $from.parentOffset, undefined, '￼');
  const query = mentionQueryBefore(before);
  if (query === null) return null;
  return { query, from: $from.pos - query.length - 1, to: $from.pos };
}

const sameQuery = (a: MentionQuery | null, b: MentionQuery | null) =>
  a?.query === b?.query && a?.from === b?.from && a?.to === b?.to;

/**
 * Drives the @mention list: watches the caret, searches as the user types,
 * and handles the keys the open list owns (↑ ↓ Enter Tab Esc). Inert when
 * `mentions` is not given.
 */
export function useMentionSuggest(editor: Editor | null, mentions: RichTextMentions | undefined) {
  const [current, setCurrent] = useState<MentionQuery | null>(null);
  const [dismissedFrom, setDismissedFrom] = useState<number | null>(null);
  const [items, setItems] = useState<readonly RichTextMentionItem[]>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!editor || !mentions) return undefined;
    const detect = () => {
      const next = readMentionQuery(editor);
      setCurrent((previous) => (sameQuery(previous, next) ? previous : next));
    };
    editor.on('transaction', detect);
    return () => {
      editor.off('transaction', detect);
    };
  }, [editor, mentions]);

  // Closed as soon as mentioning is switched off (the editor went read-only), whatever was being typed.
  const typing = mentions && current !== null && current.from !== dismissedFrom ? current : null;
  const open = typing !== null;
  const query = typing?.query ?? null;

  useEffect(() => {
    if (query === null || !mentions) return undefined;
    let live = true;
    setLoading(true);
    mentions
      .search(query)
      .then((found) => {
        if (!live) return;
        setItems(found);
        setActive(0);
      })
      .catch(() => {
        if (live) setItems(EMPTY);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [mentions, query]);

  const select = (item: RichTextMentionItem) => {
    if (!editor || !typing) return;
    editor
      .chain()
      .focus()
      .insertContentAt({ from: typing.from, to: typing.to }, [
        { type: MENTION_NODE, attrs: { id: item.id, label: item.label } },
        { type: 'text', text: ' ' },
      ])
      .run();
    setCurrent(null);
  };

  /** The open list's keys; true when the key was used (the editor must not act on it). */
  const onKeyDown = (event: KeyboardEvent): boolean => {
    if (!typing) return false;
    if (event.key === 'Escape') {
      setDismissedFrom(typing.from);
      return true;
    }
    if (items.length === 0) return false;
    if (event.key === 'ArrowDown') {
      setActive((index) => (index + 1) % items.length);
      return true;
    }
    if (event.key === 'ArrowUp') {
      setActive((index) => (index - 1 + items.length) % items.length);
      return true;
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      select(items[Math.min(active, items.length - 1)]);
      return true;
    }
    return false;
  };

  return { open, items: open ? items : EMPTY, loading: open && loading, active, select, onKeyDown: mentions ? onKeyDown : ignoreKeys };
}
