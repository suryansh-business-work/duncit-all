import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Alert, Stack } from '@mui/material';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import { logs } from '@duncit/logs';
import { isVenueChatUnavailable, venueChatCounterpart } from '@duncit/utils';
import EmptyState from '../../components/EmptyState';
import { useTranslation } from '../../i18n/useTranslation';
import { useUserInfo } from '../../user-info/useUserInfo';
import ChatMessageList from '../chat-room-page/ChatRoomPage/ChatMessageList';
import ChatRoomLoading from '../chat-room-page/ChatRoomPage/ChatRoomLoading';
import VenueChatComposer from './VenueChatComposer';
import VenueChatHeader from './VenueChatHeader';
import { useVenueChatSocket } from './useVenueChatSocket';
import { useVenueChatThread } from './useVenueChatThread';

/**
 * `/venue-chat/:podId` — the private thread between a pod's hosts and the
 * venue it is booked at. The group chat's list, bubbles and composer; the
 * header shows the other side. A reader on neither side gets "not available".
 */
export default function VenueChatPage() {
  const { t } = useTranslation();
  const { podId } = useParams<{ podId: string }>();
  const navigate = useNavigate();
  const { me } = useUserInfo();
  const thread = useVenueChatThread(podId);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const room = thread.room;
  const venueSide = room?.my_side === 'VENUE';

  useVenueChatSocket({
    podId: room?.pod_id,
    onLine: (line) => thread.addLines([line]),
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
    <Stack data-testid="venue-chat-screen" sx={{ height: '100%', minHeight: 0, mx: { xs: -1.25, sm: -2 } }}>
      <VenueChatHeader counterpart={venueChatCounterpart(room)} venueSide={venueSide} onBack={goBack} />
      {error && (
        <Alert severity="error" data-testid="venue-chat-error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <ChatMessageList
        scrollRef={scrollRef}
        podEnded={null}
        messages={thread.lines}
        myId={me?.user_id}
        canLoadOlder={thread.canLoadOlder}
        loadOlder={thread.loadOlder}
        onOpenProfile={(userId) => navigate(`/u/${userId}`)}
        emptyText={venueSide ? t('mweb.venueChat.emptyVenue') : t('mweb.venueChat.emptyHost')}
      />
      <VenueChatComposer send={thread.send} onError={setError} />
    </Stack>
  );
}
