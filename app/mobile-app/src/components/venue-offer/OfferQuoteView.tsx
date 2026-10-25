import { Text, YStack } from 'tamagui';
import { offerQuoteRange } from '@duncit/utils';

import { BreakdownLines } from '@/components/venue-pricing/BreakdownLines';
import { useTranslation } from '@/hooks/useTranslation';
import { OfferMoney } from './OfferMoney';
import type { OfferQuote, OfferSide } from './offer-format';

interface Props {
  side: OfferSide;
  /** Priced for the most guests. */
  quote: OfferQuote;
  /** Priced for the fewest guests; left out, the booking has no minimum. */
  quoteMin?: OfferQuote | null;
  testID: string;
}

/**
 * A quote of an offer's terms: the money as a range from the fewest guests to
 * the most, then the server's breakdown line by line at the most guests — said
 * so when the two ends differ. Nothing is computed here. mWeb twin: OfferQuoteView.
 */
export function OfferQuoteView({ side, quote, quoteMin, testID }: Readonly<Props>) {
  const { t } = useTranslation();
  const range = offerQuoteRange(quote, quoteMin);

  return (
    <YStack gap={8} testID={testID}>
      <OfferMoney side={side} range={range} />
      {range.ranged ? (
        <Text testID={`${testID}-breakdown-at`} fontSize={12} fontWeight="700" color="$muted">
          {t('availability.offers.ask.breakdownAt', { vars: { count: quote.pax } })}
        </Text>
      ) : null}
      <BreakdownLines breakdown={quote} testID={`${testID}-lines`} />
    </YStack>
  );
}
