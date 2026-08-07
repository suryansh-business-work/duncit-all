import { useCallback, useMemo, useState } from 'react';
import type { StaffMessage } from './queries';

interface Options {
  messages: StaffMessage[];
  meId: string;
  nameOf: (userId: string) => string;
  onDelete: (id: string, forEveryone: boolean) => void;
}

/**
 * Picking several messages at once.
 *
 * Selection is a MODE, not a permanent affordance: while nothing is picked the
 * thread must not hand its bubbles a click handler, or clicking a link or a
 * reaction would quietly select the message instead of doing what was asked.
 * `active` is what the conversation checks before wiring one up.
 */
export function useMessageSelection({ messages, meId, nameOf, onDelete }: Options) {
  const [ids, setIds] = useState<Set<string>>(new Set());

  const selected = useMemo(
    () => messages.filter((message) => ids.has(message.id)),
    [messages, ids]
  );

  const toggle = useCallback((id: string) => {
    setIds((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  const start = useCallback((id: string) => setIds(new Set([id])), []);
  const clear = useCallback(() => setIds(new Set()), []);

  /** Copy what was picked, in thread order, one message per line. */
  const copy = useCallback(() => {
    const text = selected
      .map(
        (message) =>
          `${nameOf(message.from_user_id)}: ${message.text || message.attachment_name || ''}`
      )
      .join('\n');
    globalThis.navigator.clipboard?.writeText(text).catch(() => undefined);
    clear();
  }, [selected, nameOf, clear]);

  const remove = useCallback(
    (forEveryone: boolean) => {
      selected.forEach((message) => onDelete(message.id, forEveryone));
      clear();
    },
    [selected, onDelete, clear]
  );

  return {
    ids,
    selected,
    active: ids.size > 0,
    /** Taking a message back reaches the other person, so it needs all mine. */
    allMine: selected.every((message) => message.from_user_id === meId),
    toggle,
    start,
    clear,
    copy,
    remove,
  };
}
