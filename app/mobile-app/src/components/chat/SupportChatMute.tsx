import { ChatMuteButton } from '@/components/chat/ChatMuteButton';
import { ChatRoomKind } from '@/generated/graphql/graphql';
import { useChatMute } from '@/hooks/useChatMute';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  sessionId: string;
  /** Where a failed change is said — the support screen's error line. */
  onError: (message: string) => void;
}

/** The mute bell for the customer's support chat — replies stop pushing while
 * it is on. mWeb twin: components/chat-state/SupportChatMute. */
export function SupportChatMute({ sessionId, onError }: Readonly<Props>) {
  const { t } = useTranslation();
  const mute = useChatMute({
    kind: ChatRoomKind.Support,
    id: sessionId,
    onError,
    failedText: t('mweb.chatRoom.mute.failed'),
  });
  return (
    <ChatMuteButton
      muted={mute.muted}
      mutedUntil={mute.mutedUntil}
      busy={mute.busy}
      onChoose={mute.choose}
    />
  );
}
