import { useRef, useState } from 'react';
import { mentionQuery, parseApiError } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { useMentionComposer } from './useMentionComposer';
import { useRoomMembers } from './useRoomMembers';
import type { ChatRoomKind } from './usePodSocket';
import type { ChatRoomSource } from './useChatRoomSource';
import type { ChatMessage, ChatParticipantsData } from './chat.types';

interface Options {
  kind: ChatRoomKind;
  id: string | undefined;
  room: ChatRoomSource;
  messages: ReadonlyArray<ChatMessage>;
  people?: ChatParticipantsData['chatParticipants'] | null;
  onError: (message: string) => void;
}

/**
 * Everything typed into a room: the text, the line being answered, the @ list
 * and sending — a text, or a photo — with the reply and mentions attached.
 */
export function useRoomComposer({ kind, id, room, messages, people, onError }: Options) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [caret, setCaret] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const query = caret === null ? null : mentionQuery(text, caret);
  const members = useRoomMembers(kind, id, query, people);
  const mention = useMentionComposer({
    text,
    setText,
    query,
    caret,
    setCaret,
    members,
    selfId: room.myId,
    inputRef,
  });

  const submit = async (imageUrl?: string) => {
    const body = text.trim();
    if (!body && !imageUrl) return;
    try {
      await room.send({
        type: imageUrl ? 'IMAGE' : 'TEXT',
        text: imageUrl ? '' : body,
        image_url: imageUrl || null,
        reply_to_id: replyTo?.id ?? null,
        mentions: imageUrl ? [] : mention.mentionIds(body),
      });
      setText('');
      setReplyTo(null);
      mention.clear();
    } catch (e) {
      onError(parseApiError(e) || t('mweb.chatRoom.sendFailed'));
    }
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
    trackCaret: () => setCaret(inputRef.current?.selectionStart ?? null),
    mention,
    submit,
  };
}
