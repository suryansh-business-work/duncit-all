import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { isOpenOfferMove, venueChatOfferTitleKey, type VenueChatOfferMove } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { OfferChatActions, type OfferChatAnswering } from './OfferChatActions';
import { OfferMoveDetails } from './OfferMoveDetails';

interface Props {
  move: VenueChatOfferMove;
  /** The thread's newest offer line: only it may still be answered, and only it shows an answer-by time. */
  newest: boolean;
  answering: OfferChatAnswering;
}

/** OFFER and COUNTER wait on an answer; the rest close the offer. */

/**
 * One move of a booking offer as a card in the pod's venue chat — "The venue
 * countered", "You accepted — booking confirmed" — with the terms it carried
 * and, on the move still waiting on the reader, their answers. A move of the
 * reader's own sits on their side of the thread. mWeb twin: OfferChatCard.
 */
export function OfferChatCard({ move, newest, answering }: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary } = useThemeColors();
  const { side } = answering;
  const title = t(venueChatOfferTitleKey(move, side));

  return (
    <YStack
      testID={`offer-line-${move.slot_id}-${move.round}-${move.event}`}
      role="article"
      aria-label={title}
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
      />
      <OfferChatActions move={move} newest={newest} answering={answering} />
    </YStack>
  );
}
