import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { venueOfferPin, type PinnedOfferSource } from '@duncit/utils';

import { OfferAnswerBy } from '@/components/venue-offer/OfferAsk';
import type { OfferSide } from '@/components/venue-offer/offer-format';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** The pod's live offer; null when it has none (declined or ran out — the hold is gone). */
  offer: PinnedOfferSource | null;
  /** The reader's side: "your move" and "your counters" are theirs. */
  side: OfferSide;
}

/**
 * The bar pinned under the venue chat's header: where the booking offer stands
 * for the reader (their move, waiting on the other side, confirmed, declined),
 * and while it is open, how many counters each side has left of its share
 * (Pod Settings caps them) and until when the move waiting must be answered.
 * Nothing while the pod has no live offer. mWeb twin: VenueChatOfferPin.
 */
export function VenueChatOfferPin({ offer, side }: Readonly<Props>) {
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  const pin = venueOfferPin(offer, side);
  if (!pin?.statusKey) return null;
  const counters = [
    pin.mine ? t('availability.offers.pin.mine', { vars: pin.mine }) : '',
    pin.theirs && side === 'HOST' ? t('availability.offers.pin.venue', { vars: pin.theirs }) : '',
    pin.theirs && side === 'VENUE' ? t('availability.offers.pin.host', { vars: pin.theirs }) : '',
  ].filter(Boolean);

  return (
    <YStack
      testID="venue-chat-offer-pin"
      role="summary"
      aria-label={t('availability.offers.pin.title')}
      gap={4}
      paddingHorizontal={16}
      paddingVertical={10}
      backgroundColor="$soft"
      borderBottomWidth={1}
      borderColor="$borderColor"
    >
      <XStack gap={8} alignItems="center">
        <MaterialIcons name="push-pin" size={16} color={accent} aria-hidden />
        <Text fontSize={13} fontWeight="700" color="$color">
          {t('availability.offers.pin.title')}
        </Text>
        <Text
          testID="venue-chat-offer-pin-status"
          flex={1}
          textAlign="right"
          fontSize={13}
          fontWeight="700"
          color={pin.open ? '$accent' : '$muted'}
          numberOfLines={1}
        >
          {t(pin.statusKey)}
        </Text>
      </XStack>
      {pin.open && counters.length > 0 ? (
        <Text testID="venue-chat-offer-pin-counters" fontSize={12} color="$muted">
          {counters.join(' · ')}
        </Text>
      ) : null}
      {pin.open ? <OfferAnswerBy at={pin.expiresAt} /> : null}
    </YStack>
  );
}
