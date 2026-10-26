import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert, Stack } from '@mui/material';
import {
  OfferChatCard,
  SeenFaces,
  VenueOfferPinnedBar,
  isOfferChatLine,
  useChatVenueOffer,
  type OfferChatAnswering,
} from '@duncit/availability-calendar';
import type { VenueChatRoom } from '@duncit/gql-types';
import { venueChatCounterpart, type VenueChatLine, type VenueChatOfferMove } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { useUserInfo } from '../../user-info/useUserInfo';
import ChatMessageList from '../chat-room-page/ChatRoomPage/ChatMessageList';
import VenueChatComposer from './VenueChatComposer';
import VenueChatHeader from './VenueChatHeader';
import VenueChatOverlays from './VenueChatOverlays';
import VenueChatResubmit from './VenueChatResubmit';
import { useVenueChatInteractions } from './useVenueChatInteractions';
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
 * An open venue thread: the header with a Contact button for both sides'
 * details, the booking offer pinned under it (where it stands, the counters each
 * side has left), the group chat's list — each OFFER line drawn as its offer
 * card, answerable on the move still waiting on the reader, every line with its
 * time, reactions and the faces of whoever has read that far — and the composer.
 * The reader's own lines can be edited or deleted from the message menu.
 */
export default function VenueChatRoomView({ room, thread, error, onError, onBack }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { me } = useUserInfo();
  const meId = me?.user_id;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [newOffer, setNewOffer] = useState<VenueChatOfferMove | null>(null);
  const side = room.my_side;
  const offers = useChatVenueOffer(room.pod_id, thread.lines, true);
  const lines = useLinesById(thread.lines);
  const ui = useVenueChatInteractions({ podId: room.pod_id, side, thread, meId, onError });
  const closeNewOffer = useCallback(() => setNewOffer(null), []);

  const answering: OfferChatAnswering = {
    live: offers.offer,
    subject: { pod_id: room.pod_id, pod_title: room.pod_title, venue_name: room.venue_name },
    onAnswered: offers.refresh,
    onSendNewOffer: side === 'HOST' ? setNewOffer : undefined,
  };
  const renderMessage = (message: { id: string }) => {
    const line = lines.get(message.id);
    if (!line || !isOfferChatLine(line)) return null;
    return (
      <OfferChatCard
        move={line.offer}
        viewer={side}
        newest={message.id === offers.newestId}
        answering={answering}
        podIsFree={!!room.pod_is_free}
        line={line}
        viewerId={meId}
        onReact={(emoji) => ui.react(line.id, emoji)}
        seen={ui.seen(line)}
      />
    );
  };

  return (
    <Stack data-testid="venue-chat-screen" sx={{ height: '100%', minHeight: 0, mx: { xs: -1.25, sm: -2 } }}>
      <VenueChatHeader
        counterpart={venueChatCounterpart(room)}
        venueSide={side === 'VENUE'}
        parties={{ host: room.host, venue: room.venue }}
        onBack={onBack}
      />
      <VenueOfferPinnedBar offer={offers.offer} side={side} />
      {error && (
        <Alert severity="error" data-testid="venue-chat-error" onClose={() => onError(null)}>
          {error}
        </Alert>
      )}
      <ChatMessageList
        scrollRef={scrollRef}
        podEnded={null}
        messages={thread.lines}
        myId={meId}
        onOpenReact={ui.openReact}
        onOpenActions={ui.openMenu}
        canLoadOlder={thread.canLoadOlder}
        loadOlder={thread.loadOlder}
        onOpenProfile={(userId) => navigate(`/u/${userId}`)}
        emptyText={side === 'VENUE' ? t('mweb.venueChat.emptyVenue') : t('mweb.venueChat.emptyHost')}
        renderMessage={renderMessage}
        renderAfter={(message) => <SeenFaces marks={ui.facesOf(message)} />}
      />
      <VenueChatComposer send={thread.send} onError={onError} />
      <VenueChatOverlays ui={ui} error={error} />
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

/** The thread's lines by id, for the offer cards to find their own line. */
function useLinesById(lines: readonly VenueChatLine[]) {
  return useMemo(() => new Map(lines.map((line) => [line.id, line])), [lines]);
}
