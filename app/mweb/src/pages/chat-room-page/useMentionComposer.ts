import { useState, type RefObject } from 'react';
import { applyMention, filterMentionCandidates, mentionHandle, mentionIdsInText } from '@duncit/utils';
import type { ChatMember } from './chat.types';

interface Options {
  text: string;
  setText: (value: string) => void;
  /** The half-typed @word under the caret, or null (from `mentionQuery`). */
  query: string | null;
  /** Where the caret is; the composer owns it so the member search can read the query first. */
  caret: number | null;
  setCaret: (caret: number | null) => void;
  members: ReadonlyArray<ChatMember>;
  selfId?: string | null;
  inputRef: RefObject<HTMLTextAreaElement | null>;
}

/**
 * The composer's @ list: the members the typed @word matches, inserting a
 * pick, and the ids to send (only picks whose @name is still in the text).
 */
export function useMentionComposer({ text, setText, query, caret, setCaret, members, selfId, inputRef }: Options) {
  const [picked, setPicked] = useState<ChatMember[]>([]);
  const candidates = query === null ? [] : filterMentionCandidates(members, query, selfId);

  const pick = (member: ChatMember) => {
    const edit = applyMention(text, caret ?? text.length, mentionHandle(member.full_name));
    setText(edit.text);
    setPicked((prev) => (prev.some((m) => m.user_id === member.user_id) ? prev : [...prev, member]));
    setCaret(null);
    // Back to the input, caret after the inserted name, once React has written it.
    globalThis.requestAnimationFrame(() => {
      const input = inputRef.current;
      input?.focus();
      input?.setSelectionRange(edit.caret, edit.caret);
    });
  };

  return {
    candidates,
    pick,
    /** Enter with the list open picks its first name; true when it did. */
    pickFirst: () => {
      const [first] = candidates;
      if (first) pick(first);
      return !!first;
    },
    mentionIds: (sentText: string) => mentionIdsInText(sentText, picked),
    clear: () => setPicked([]),
  };
}
