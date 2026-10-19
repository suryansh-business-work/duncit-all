import { useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import {
  applyMention,
  filterMentionCandidates,
  mentionHandle,
  mentionIdsInText,
  mentionQuery,
  type MentionMember,
} from '@duncit/utils';

import type { ChatMessage } from '@/hooks/useChat';
import type { ChatSendExtras } from '@/hooks/useChatRoom';
import type { ChatRoomKind } from '@/hooks/usePodSocket';
import { useRoomMembers, type RoomMember } from '@/hooks/useRoomMembers';

interface Options {
  kind: ChatRoomKind;
  roomId: string;
  meId?: string | null;
  messages: readonly ChatMessage[];
  /** A pod room's hosts and participants, already loaded for its people panel. */
  podPeople: readonly RoomMember[];
  sendText: (text: string, extras?: ChatSendExtras) => Promise<boolean>;
}

/**
 * Everything typed into a room: the text, the line being answered, the @ list
 * and sending a line with its reply and mentions. mWeb twin:
 * chat-room-page/useRoomComposer.
 */
export function useRoomComposer({ kind, roomId, meId, messages, podPeople, sendText }: Options) {
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [caret, setCaret] = useState<number | null>(null);
  const [picked, setPicked] = useState<MentionMember[]>([]);
  const inputRef = useRef<TextInput | null>(null);

  const query = caret === null ? null : mentionQuery(text, caret);
  const members = useRoomMembers(kind, roomId, query, podPeople);
  const candidates = query === null ? [] : filterMentionCandidates(members, query, meId);

  const pickMention = (member: RoomMember) => {
    const edit = applyMention(text, caret ?? text.length, mentionHandle(member.full_name));
    setText(edit.text);
    setPicked((prev) =>
      prev.some((m) => m.user_id === member.user_id) ? prev : [...prev, member],
    );
    setCaret(null);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelection?.(edit.caret, edit.caret);
    });
  };

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    const sent = await sendText(body, {
      replyToId: replyTo?.id ?? null,
      mentions: mentionIdsInText(body, picked),
    });
    if (!sent) return;
    setText('');
    setReplyTo(null);
    setPicked([]);
  };

  return {
    text,
    setText,
    inputRef,
    replyTo,
    startReply: (messageId: string) => {
      setReplyTo(messages.find((m) => m.id === messageId) ?? null);
      inputRef.current?.focus();
    },
    cancelReply: () => setReplyTo(null),
    onCaret: (position: number) => setCaret(position),
    candidates,
    pickMention,
    send,
  };
}
