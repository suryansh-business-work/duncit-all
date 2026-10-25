import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert, Stack } from '@mui/material';
import { OfferChatCard, isOfferChatLine, useChatVenueOffer, type OfferChatAnswering } from '@duncit/availability-calendar';
import type { VenueChatRoom } from '@duncit/gql-types';
import { venueChatCounterpart, type VenueChatOfferMove } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { useUserInfo } from '../../user-info/useUserInfo';
import ChatMessageList from '../chat-room-page/ChatRoomPage/ChatMessageList';
import VenueChatComposer from './VenueChatComposer';
import VenueChatHeader from './VenueChatHeader';
import VenueChatResubmit from './VenueChatResubmit';
import type { useVenueChatThread } from './useVenueChatThread';

interface Props {
  room: Omit<VenueChatRoom, '__typename'>;
  thread: ReturnType<typeof useVenueChatThread>;
  /** The page's notice — a failed send, a refused join, a new offer that could not open. */
  error: string | null;
  onError: (message: string | null) => void;
  onBack: () => void;
}

/**
 * An open venue thread: the header with how to reach the other side, the
 * group chat's list — each OFFER line drawn as its offer card, answerable on
 * the move still waiting on the reader — and the composer. The live offer is
 * re-read whenever a new OFFER line arrives and after every answer; a host
 * sends a new offer from a declined line through the resubmit dialog.
 */
export default function VenueChatRoomView({ room, thread, error, onError, onBack }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { me } = useUserInfo();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [newOffer, setNewOffer] = useState<VenueChatOfferMove | null>(null);
  const side = room.my_side;
  const offers = useChatVenueOffer(room.pod_id, thread.lines, true);
  const moves = useMemo(
    () => new Map(thread.lines.filter(isOfferChatLine).map((line) => [line.id, line.offer])),
    [thread.lines],
  );
  const closeNewOffer = useCallback(() => setNewOffer(null), []);

  const answering: OfferChatAnswering = {
    live: offers.offer,
    subject: { pod_id: room.pod_id, pod_title: room.pod_title, venue_name: room.venue_name },
    onAnswered: offers.refresh,
    onSendNewOffer: side === 'HOST' ? setNewOffer : undefined,
  };
  const renderMessage = (message: { id: string }) => {
    const move = moves.get(message.id);
    if (!move) return null;
    return (
      <OfferChatCard
        move={move}
        viewer={side}
        newest={message.id === offers.newestId}
        answering={answering}
        podIsFree={!!room.pod_is_free}
      />
    );
  };

  return (
    <Stack data-testid="venue-chat-screen" sx={{ height: '100%', minHeight: 0, mx: { xs: -1.25, sm: -2 } }}>
      <VenueChatHeader counterpart={venueChatCounterpart(room)} venueSide={side === 'VENUE'} onBack={onBack} />
      {error && (
        <Alert severity="error" data-testid="venue-chat-error" onClose={() => onError(null)}>
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
        emptyText={side === 'VENUE' ? t('mweb.venueChat.emptyVenue') : t('mweb.venueChat.emptyHost')}
        renderMessage={renderMessage}
      />
      <VenueChatComposer send={thread.send} onError={onError} />
      <VenueChatResubmit
        podId={room.pod_id}
        move={newOffer}
        onClose={closeNewOffer}
        // The new offer posts its own OFFER line, and that line re-reads the live offer.
        onSaved={closeNewOffer}
        onError={onError}
      />
    </Stack>
  );
}
