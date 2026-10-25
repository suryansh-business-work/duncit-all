import { Text, XStack, YStack } from 'tamagui';
import { moneyRangeText, offerQuoteRange } from '@duncit/utils';

import type { HostVenueQuote } from '@/hooks/useOfferQuote';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** The offer priced at the pod's spots — the most guests. */
  quote: HostVenueQuote;
  /** The same offer priced at the venue's minimum guests — the fewest. */
  quoteMin: HostVenueQuote | null;
  money: (rupees: number) => string;
}

function RangeRow({
  label,
  value,
  testID,
}: Readonly<{ label: string; value: string; testID: string }>) {
  return (
    <XStack justifyContent="space-between" gap={12}>
      <Text flex={1} fontSize={13} fontWeight="600" color="$color">
        {label}
      </Text>
      <Text testID={testID} fontSize={13} fontWeight="700" color="$color">
        {value}
      </Text>
    </XStack>
  );
}

/**
 * A per-guest offer is paid for at least the venue's minimum guests and at
 * most the pod's spots, so what the venue receives and what the booking costs
 * the pod read as ranges, fewest guests first — then the breakdown below is
 * named as the one at the most guests. Nothing is drawn when both ends are the
 * same money (any other pricing option, or no minimum below the spots).
 * mWeb twin: QuoteRangeRows.
 */
export function QuoteRangeRows({ quote, quoteMin, money }: Readonly<Props>) {
  const { t } = useTranslation();
  const range = offerQuoteRange(quote, quoteMin);
  if (!quoteMin || !range.ranged) return null;
  return (
    <YStack gap={6} testID="create-pod-quote-range">
      <RangeRow
        label={t('availability.offers.ask.venueReceives')}
        value={moneyRangeText(range.venueMin, range.venueMax, money)}
        testID="create-pod-quote-venue-range"
      />
      <RangeRow
        label={t('availability.offers.ask.podCost')}
        value={moneyRangeText(range.totalMin, range.totalMax, money)}
        testID="create-pod-quote-total-range"
      />
      <Text fontSize={12} color="$muted">
        {t('availability.offers.ask.range', { vars: { min: quoteMin.pax, max: quote.pax } })}
      </Text>
      <YStack height={1} backgroundColor="$borderColor" />
      <Text fontSize={12} fontWeight="600" color="$muted">
        {t('availability.offers.ask.breakdownAt', { vars: { count: quote.pax } })}
      </Text>
    </YStack>
  );
}
