import { Text, YStack } from 'tamagui';
import type { OfferQuoteRange } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import { offerMoneyRange, type OfferSide } from './offer-format';

interface Props {
  /** VENUE reads "You receive …" first; HOST reads what the booking costs the pod. */
  side: OfferSide;
  /** The money at the fewest guests and at the most (`offerQuoteRange`, or an offer line's own). */
  range: Readonly<Omit<OfferQuoteRange, 'ranged'>>;
}

/**
 * What a booking's terms come to, from the venue's minimum guests to the pod's
 * spots — one amount when both ends agree. The server priced both ends; this
 * only words them for the side reading. mWeb twin: OfferMoney.
 */
export function OfferMoney({ side, range }: Readonly<Props>) {
  const { t } = useTranslation();
  const venue = offerMoneyRange(range.venueMin, range.venueMax);
  const total = offerMoneyRange(range.totalMin, range.totalMax);
  const venueSide = side === 'VENUE';
  const lead = venueSide
    ? t('availability.offers.youReceive', { vars: { amount: venue } })
    : t('availability.offers.chat.podPays', { vars: { amount: total } });
  const second = venueSide
    ? t('availability.offers.hostPays', { vars: { amount: total } })
    : t('availability.offers.venueReceives', { vars: { amount: venue } });

  return (
    <YStack gap={2} testID="offer-money">
      <Text fontSize={15} fontWeight="700" color={venueSide ? '$success' : '$color'}>
        {lead}
      </Text>
      <Text fontSize={12} color="$muted">
        {second}
      </Text>
    </YStack>
  );
}
