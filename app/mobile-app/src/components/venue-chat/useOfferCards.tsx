import { useCallback, useState } from 'react';
import type { VenueChatOfferMove } from '@duncit/utils';

import type { OfferSide } from '@/components/venue-offer/offer-format';
import { VenueChatSide } from '@/generated/graphql/graphql';
import type { ChatMessage } from '@/hooks/useChat';
import { useChatVenueOffer } from '@/hooks/useChatVenueOffer';
import type { VenueChatMessage, VenueChatRoom } from '@/hooks/useVenueChat';
import { OfferChatCard } from './OfferChatCard';

/**
 * A venue thread's offer lines as cards: each OFFER line drawn as its move,
 * answerable on the move still waiting on the reader (the live offer re-read
 * when a new one lands), what the last answer came to, and the move a host is
 * sending a new offer from. `ready` is true once the first page is in.
 */
export function useOfferCards(
  podId: string,
  room: VenueChatRoom | null,
  lines: readonly VenueChatMessage[],
  ready: boolean,
) {
  const offers = useChatVenueOffer(podId, lines, ready);
  const [newOffer, setNewOffer] = useState<VenueChatOfferMove | null>(null);
  const closeNewOffer = useCallback(() => setNewOffer(null), []);
  const side: OfferSide = room?.my_side ?? VenueChatSide.Host;
  const answers = side === 'VENUE' ? offers.venue : offers.host;

  /** The card for an OFFER line this build knows; null keeps the line's own bubble. */
  const renderMessage = (message: ChatMessage) => {
    const move = offers.moves.get(message.id);
    if (!move || !room) return null;
    return (
      <OfferChatCard
        move={move}
        newest={message.id === offers.newestId}
        answering={{
          side,
          live: offers.live,
          room,
          venue: offers.venue,
          host: offers.host,
          onSendNewOffer: setNewOffer,
        }}
      />
    );
  };

  return {
    renderMessage,
    notice: answers.notice,
    clearNotice: answers.clearNotice,
    newOffer,
    closeNewOffer,
  };
}
