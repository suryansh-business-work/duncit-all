import { useCallback, useState, type ReactNode } from 'react';
import { seenByOtherSide, type VenueChatOfferMove, type VenueChatReadMark } from '@duncit/utils';

import type { OfferSide } from '@/components/venue-offer/offer-format';
import { VenueChatSide } from '@/generated/graphql/graphql';
import { useChatVenueOffer } from '@/hooks/useChatVenueOffer';
import type { VenueChatMessage, VenueChatRoom } from '@/hooks/useVenueChat';
import { OfferChatCard } from './OfferChatCard';

/** What the thread puts around an offer card, as around every line. */
export interface OfferCardDecor {
  /** The line's reactions, time and edited mark. */
  footer: ReactNode;
  /** Long press: the line's actions. */
  onLongPress?: () => void;
}

/**
 * A venue thread's offer lines as cards: each OFFER line drawn as its move,
 * answerable on the move still waiting on the reader (the live offer re-read
 * when a new one lands), the reader's own counter editable until the other
 * side has read that far (`marks`), what the last answer came to, and the move
 * a host is sending a new offer from. `ready` is true once the first page is in.
 */
export function useOfferCards(
  podId: string,
  room: VenueChatRoom | null,
  lines: readonly VenueChatMessage[],
  ready: boolean,
  marks: readonly VenueChatReadMark[],
) {
  const offers = useChatVenueOffer(podId, lines, ready);
  const [newOffer, setNewOffer] = useState<VenueChatOfferMove | null>(null);
  const closeNewOffer = useCallback(() => setNewOffer(null), []);
  const side: OfferSide = room?.my_side ?? VenueChatSide.Host;
  const answers = side === 'VENUE' ? offers.venue : offers.host;
  const { revise } = offers;

  /** The card for an OFFER line this build knows; null keeps the line's own bubble. */
  const renderCard = (line: VenueChatMessage, decor: OfferCardDecor) => {
    const move = offers.moves.get(line.id);
    if (!move || !room) return null;
    return (
      <OfferChatCard
        move={move}
        newest={line.id === offers.newestId}
        seen={seenByOtherSide(line, marks, side)}
        footer={decor.footer}
        onLongPress={decor.onLongPress}
        answering={{
          side,
          live: offers.live,
          room,
          venue: offers.venue,
          host: offers.host,
          revise,
          onSendNewOffer: setNewOffer,
        }}
      />
    );
  };

  return {
    renderCard,
    /** The pod's live offer, for the thread's pinned bar; null when it has none. */
    live: offers.live,
    side,
    // An edit or withdrawal of one's own counter says so as an answer does.
    notice: revise.notice ?? answers.notice,
    clearNotice: () => {
      revise.clearNotice();
      answers.clearNotice();
    },
    newOffer,
    closeNewOffer,
  };
}
