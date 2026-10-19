import { notifyError } from '../notify';
import { useTranslation } from '../../i18n/useTranslation';
import ChatMuteMenu from './ChatMuteMenu';
import { useChatMute } from './useChatMute';

/** The mute bell for the customer's support chat — replies stop pushing while it is on. */
export default function SupportChatMute({ sessionId }: Readonly<{ sessionId: string }>) {
  const { t } = useTranslation();
  const mute = useChatMute({
    kind: 'SUPPORT',
    id: sessionId,
    onError: notifyError,
    failedText: t('mweb.chatRoom.mute.failed'),
  });
  return <ChatMuteMenu muted={mute.muted} mutedUntil={mute.mutedUntil} busy={mute.busy} onChoose={mute.choose} />;
}
