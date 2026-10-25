import { Spinner, Text, XStack, YStack } from 'tamagui';
import type { VenueOfferTerms } from '@duncit/forms/schemas';

import { offerPriceTermsInput } from '@/components/venue-offer/offer-terms-input';
import { OfferQuoteView } from '@/components/venue-offer/OfferQuoteView';
import type { OfferSide } from '@/components/venue-offer/offer-format';
import { useCounterQuote, type CounterQuoteTarget } from '@/hooks/useCounterQuote';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  target: CounterQuoteTarget;
  /** How the price reads: the side countering. */
  side: OfferSide;
  /** The terms typed so far; null until they are usable (nothing is asked). */
  terms: VenueOfferTerms | null;
}

/**
 * "What these terms come to": the server's price of the counter as it is
 * typed — the money from the fewest guests to the most and the breakdown — or
 * why it cannot be taken. The points and the note never ask for a new price.
 */
export function CounterQuotePreview({ target, side, terms }: Readonly<Props>) {
  const { t } = useTranslation();
  const quote = useCounterQuote(
    target,
    terms ? offerPriceTermsInput(terms) : null,
    t('availability.offers.quoteFailed'),
  );
  const result = quote.result;

  return (
    <YStack gap={8} testID="venue-offer-counter-quote">
      <Text role="heading" fontSize={15} fontWeight="600" color="$color">
        {t('availability.offers.preview')}
      </Text>
      {quote.isLoading ? (
        <XStack gap={8} alignItems="center">
          <Spinner color="$primary" />
          <Text fontSize={13} color="$muted">
            {t('availability.offers.quoteLoading')}
          </Text>
        </XStack>
      ) : null}
      {quote.error ? (
        <Text role="alert" fontSize={13} color="$danger">
          {quote.error}
        </Text>
      ) : null}
      {result && !result.ok ? (
        <Text role="alert" fontSize={13} color="$warning">
          {result.message}
        </Text>
      ) : null}
      {result?.quote ? (
        <OfferQuoteView
          side={side}
          quote={result.quote}
          quoteMin={result.quote_min}
          testID="venue-offer-counter-priced"
        />
      ) : null}
    </YStack>
  );
}
