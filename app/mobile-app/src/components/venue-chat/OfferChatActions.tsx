import { MaterialIcons } from '@expo/vector-icons';
import { XStack } from 'tamagui';
import { venueChatOfferActions, type VenueChatOfferMove } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { HostOfferActions } from '@/components/venue-offer/HostOfferActions';
import type { OfferSide, OfferTerms } from '@/components/venue-offer/offer-format';
import { VenueOfferActions } from '@/components/venue-offer/VenueOfferActions';
import type { HostOfferAnswers } from '@/hooks/usePodVenueOffer';
import type { VenueOfferAnswers } from '@/hooks/useVenueOfferAnswers';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/** What a thread's member needs to act on its offer lines. */
export interface OfferChatAnswering {
  side: OfferSide;
  /** The pod's live offer; null when it has none (declined, ran out). */
  live: OfferTerms | null;
  /** The thread's pod, named in the confirmations. */
  room: { pod_id: string; pod_title: string; venue_name: string; pod_is_free: boolean };
  venue: VenueOfferAnswers;
  host: HostOfferAnswers;
  /** A host sends a new offer after one was declined or ran out. */
  onSendNewOffer: (move: VenueChatOfferMove) => void;
}

interface Props {
  move: VenueChatOfferMove;
  /** The thread's newest offer line — the only one that may still be answered. */
  newest: boolean;
  answering: OfferChatAnswering;
}

/**
 * What an offer line lets its reader do (`venueChatOfferActions`): answer the
 * move still waiting on them — the venue with Accept / Counter / Reject, the
 * host with Accept / Reject / Counter back, each in its own sheet — or, for a
 * host, send a new offer once the last one closed. Every older line is a record
 * and offers nothing. mWeb twin: OfferChatActions.
 */
export function OfferChatActions({ move, newest, answering }: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary } = useThemeColors();
  const { side, live, room } = answering;
  const actions = venueChatOfferActions(move, { side, newest, live });

  if (actions.answer && live) {
    return side === 'VENUE' ? (
      <VenueOfferActions
        slotId={live.slot_id}
        offer={live}
        subject={{ ...room, start_at: live.start_at, end_at: live.end_at, price: 0 }}
        answers={answering.venue}
        testIDPrefix="chat-offer"
      />
    ) : (
      <HostOfferActions
        podId={room.pod_id}
        offer={live}
        podTitle={room.pod_title}
        venueName={room.venue_name}
        answers={answering.host}
      />
    );
  }
  if (!actions.sendNew) return null;
  return (
    <XStack>
      <DuncitButton
        testID="offer-send-new"
        label={t('availability.offers.chat.sendNew')}
        onPress={() => answering.onSendNewOffer(move)}
        variant="outline"
        size="sm"
        icon={<MaterialIcons name="send" size={16} color={primary} />}
      />
    </XStack>
  );
}
