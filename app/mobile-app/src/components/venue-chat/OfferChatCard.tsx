import type { ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { isOpenOfferMove, venueChatOfferTitleKey, type VenueChatOfferMove } from '@duncit/utils';

import { freeReasonNote } from '@/components/venue-offer/offer-format';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { OfferChatActions, type OfferChatAnswering } from './OfferChatActions';
import { OfferMoveDetails } from './OfferMoveDetails';

interface Props {
  move: VenueChatOfferMove;
  /** The thread's newest offer line: only it may still be answered, and only it shows an answer-by time. */
  newest: boolean;
  answering: OfferChatAnswering;
  /** The other side has read the thread as far as this line — the reader's own counter is on the record. */
  seen?: boolean;
  /** The line's foot, as every chat line has: its reactions, when it was sent, whether it was edited. */
  footer?: ReactNode;
  /** Long press: the line's own actions (react). */
  onLongPress?: () => void;
}

/**
 * One move of a booking offer as a card in the pod's venue chat — "The venue
 * countered", "You accepted — booking confirmed" — with the terms it carried
 * and any photos, on the move still waiting on the reader their answers (or,
 * on their own unseen counter, edit and withdraw), and the line's reactions and
 * time at its foot. A move of the reader's own sits on their side of the
 * thread. The venue reads why the host asked for the venue free on a move of
 * the live booking. mWeb twin: OfferChatCard.
 */
export function OfferChatCard({
  move,
  newest,
  answering,
  seen = false,
  footer,
  onLongPress,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary } = useThemeColors();
  const { side, live } = answering;
  const title = t(venueChatOfferTitleKey(move, side));
  // The reason rides on the live offer, so only its own moves can name it.
  const freeNote =
    side === 'VENUE' && live?.slot_id === move.slot_id
      ? freeReasonNote(t, live.free_justification)
      : '';

  return (
    <YStack
      testID={`offer-line-${move.slot_id}-${move.round}-${move.event}`}
      role="article"
      aria-label={title}
      onLongPress={onLongPress}
      gap={10}
      marginHorizontal={12}
      padding={12}
      maxWidth={440}
      width="92%"
      alignSelf={move.by === side ? 'flex-end' : 'flex-start'}
      borderRadius={16}
      borderWidth={1}
      borderLeftWidth={4}
      borderColor="$primary"
      backgroundColor="$surface"
    >
      <XStack gap={8} alignItems="center">
        <MaterialIcons name="handshake" size={18} color={primary} aria-hidden />
        <Text flex={1} role="heading" fontSize={14} fontWeight="800" color="$color">
          {title}
        </Text>
      </XStack>
      <OfferMoveDetails
        move={move}
        side={side}
        podIsFree={answering.room.pod_is_free}
        open={newest && isOpenOfferMove(move.event)}
        freeNote={freeNote}
      />
      <OfferChatActions move={move} newest={newest} seen={seen} answering={answering} />
      {footer}
    </YStack>
  );
}
