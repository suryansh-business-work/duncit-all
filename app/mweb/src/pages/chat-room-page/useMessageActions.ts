import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { DELETE_MSG } from './queries';
import type { MessageActionsTarget } from './MessageActionsMenu';
import type { ChatMessage } from './chat.types';
import { useTranslation } from '../../i18n/useTranslation';

interface Options {
  messages: ChatMessage[];
  myId?: string;
  /** Takes the message out of the live list once the server confirms. */
  onRemoved: (id: string) => void;
  onError: (message: string) => void;
}

/** One message's menu, report sheet and delete — the room page's message
 * actions, kept apart from the page so it stays one readable screen. */
export function useMessageActions({ messages, myId, onRemoved, onError }: Readonly<Options>) {
  const { t } = useTranslation();
  const [target, setTarget] = useState<MessageActionsTarget | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [deleteMessage] = useMutation(DELETE_MSG);

  const open = (el: HTMLElement, id: string) => {
    const msg = messages.find((m) => m.id === id);
    setTarget({ el, id, mine: String(msg?.user_id) === String(myId) });
  };

  const remove = async (id: string) => {
    try {
      await deleteMessage({ variables: { message_id: id } });
      onRemoved(id);
    } catch {
      onError(t('mweb.chatRoom.deleteFailed'));
    }
  };

  return {
    target,
    open,
    close: () => setTarget(null),
    remove,
    reportId,
    report: setReportId,
    closeReport: () => setReportId(null),
  };
}
