import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Stack } from '@mui/material';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import { logs } from '@duncit/logs';
import { isVenueChatUnavailable } from '@duncit/utils';
import EmptyState from '../../components/EmptyState';
import { useTranslation } from '../../i18n/useTranslation';
import ChatRoomLoading from '../chat-room-page/ChatRoomPage/ChatRoomLoading';
import HostPodActionsBridge from '../host-manage-page/HostPodActionsBridge';
import VenueChatHeader from './VenueChatHeader';
import VenueChatRoomView from './VenueChatRoomView';
import { useVenueChatSocket } from './useVenueChatSocket';
import { useVenueChatThread } from './useVenueChatThread';

/**
 * `/venue-chat/:podId` — the private thread between a pod's hosts and the
 * venue it is booked at, where the two also bargain over the booking offer.
 * The group chat's list, bubbles and composer, with each offer move as a card;
 * the header shows the other side. A reader on neither side gets "not available".
 */
export default function VenueChatPage() {
  const { t } = useTranslation();
  const { podId } = useParams<{ podId: string }>();
  const navigate = useNavigate();
  const thread = useVenueChatThread(podId);
  const [error, setError] = useState<string | null>(null);
  const room = thread.room;
  const venueSide = room?.my_side === 'VENUE';

  useVenueChatSocket({
    podId: room?.pod_id,
    // An offer move arrives on the same event as a text line; the room view re-reads the offer for it.
    // A changed line (edited, reacted to, a counter revised) replaces the one on screen.
    onLine: (line) => thread.addLines([line]),
    onRemoved: thread.removeLine,
    onRead: thread.addMark,
    onJoinFailed: (code) =>
      setError(isVenueChatUnavailable(code) ? t('mweb.venueChat.unavailable') : t('mweb.venueChat.joinFailed')),
  });

  // Back lands where each side opened the thread from.
  const goBack = () => navigate(venueSide ? '/venues/pods' : '/host/manage');
  const retry = () => {
    thread.retry().catch((retryError: unknown) => logs.mWeb.warn('venueChat', 'retry', { podId, error: retryError }));
  };

  if (thread.loading) return <ChatRoomLoading />;
  if (thread.unavailable || thread.failed || !room) {
    return (
      <Stack data-testid="venue-chat-screen" sx={{ height: '100%', minHeight: 0, mx: { xs: -1.25, sm: -2 } }}>
        <VenueChatHeader counterpart={null} venueSide={false} onBack={goBack} />
        {thread.unavailable ? (
          <EmptyState
            testId="venue-chat-unavailable"
            icon={<ChatBubbleOutlineRoundedIcon />}
            title={t('mweb.venueChat.unavailable')}
            actionLabel={t('mweb.common.goBack')}
            onAction={goBack}
          />
        ) : (
          <EmptyState
            testId="venue-chat-failed"
            icon={<ErrorOutlineRoundedIcon />}
            title={t('mweb.venueChat.loadFailed')}
            actionLabel={t('mweb.venueChat.retry')}
            onAction={retry}
          />
        )}
      </Stack>
    );
  }

  return (
    // The host's "Send a new offer" opens the shared resubmit dialog, which reads its config from here.
    <HostPodActionsBridge>
      <VenueChatRoomView room={room} thread={thread} error={error} onError={setError} onBack={goBack} />
    </HostPodActionsBridge>
  );
}
