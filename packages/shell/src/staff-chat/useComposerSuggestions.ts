import { useCallback, useState } from 'react';
import { EMOJI_SHORTCODES } from './EmojiPicker';
import { applyEmoji, applyMention, emojiQuery, mentionQuery } from './mentions';
import type { Suggestion } from './SuggestionPopup';

/** Which trigger is under the caret, and what has been typed after it. */
type Query = { kind: 'MENTION' | 'EMOJI'; term: string };

/** Longest list worth showing without it becoming a scroll of its own. */
const MAX_EMOJI = 8;

interface Options {
  /** Who can be mentioned here — the other person, in a one-to-one thread. */
  mentionNames: string[];
  draft: string;
  onDraft: (text: string, caret: number) => void;
}

/**
 * What `@` and `:` offer while you type.
 *
 * ONE list, because only one of the two can be under the caret at a time — two
 * popovers racing for the same corner is how a composer starts feeling
 * unpredictable. The keyboard handling belongs with it: while the list is open
 * it owns the arrows and Enter, or picking something would send the half-typed
 * message instead.
 */
export function useComposerSuggestions({ mentionNames, draft, onDraft }: Options) {
  const [query, setQuery] = useState<Query | null>(null);
  const [active, setActive] = useState(0);

  const items: Suggestion[] = (() => {
    if (query?.kind === 'MENTION') {
      return mentionNames
        .filter((name) => name.toLowerCase().startsWith(query.term.toLowerCase()))
        .map((name) => ({ key: `mention-${name}`, label: `@${name}` }));
    }
    if (query?.kind === 'EMOJI') {
      return EMOJI_SHORTCODES.filter((entry) => entry.code.startsWith(query.term.toLowerCase()))
        .slice(0, MAX_EMOJI)
        .map((entry) => ({ key: `emoji-${entry.code}`, label: `${entry.emoji}  :${entry.code}` }));
    }
    return [];
  })();

  const close = useCallback(() => setQuery(null), []);

  /** Whichever of the two is under the caret, or nothing. */
  const read = useCallback((value: string, caret: number) => {
    const mention = mentionQuery(value, caret);
    if (mention !== null) {
      setQuery({ kind: 'MENTION', term: mention });
    } else {
      const emoji = emojiQuery(value, caret);
      setQuery(emoji === null ? null : { kind: 'EMOJI', term: emoji });
    }
    setActive(0);
  }, []);

  const pick = useCallback(
    (item: Suggestion, caret: number) => {
      const next = item.key.startsWith('emoji-')
        ? applyEmoji(draft, caret, item.label.split('  ')[0])
        : applyMention(draft, caret, item.label.slice(1));
      setQuery(null);
      onDraft(next.text, next.caret);
    },
    [draft, onDraft]
  );

  /** True when the list consumed the key and the composer should stand down. */
  const handleKey = useCallback(
    (event: React.KeyboardEvent, caret: number): boolean => {
      if (items.length === 0) return false;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : items.length - 1;
        setActive((index) => (index + step) % items.length);
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        pick(items[active] ?? items[0], caret);
        return true;
      }
      if (event.key === 'Escape') {
        setQuery(null);
        return true;
      }
      return false;
    },
    [items, active, pick]
  );

  return { items, active, read, pick, handleKey, close };
}
