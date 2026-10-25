import { Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { offerQuoteRange } from '@duncit/utils';
import PriceBreakdownView from '../pricing/preview/PriceBreakdownView';
import type { PriceBreakdown } from '../pricing/types';
import OfferMoney from './OfferMoney';
import type { OfferSide } from './offer-target';

interface Props {
  side: OfferSide;
  /** Priced for the most guests. */
  quote: PriceBreakdown;
  /** Priced for the fewest guests; left out, the booking has no minimum. */
  quoteMin?: PriceBreakdown | null;
}

/**
 * A quote of an offer's terms: the money as a range from the fewest guests to
 * the most, and the server's breakdown line by line at the most guests — said
 * so when the two ends differ.
 */
export default function OfferQuoteView({ side, quote, quoteMin }: Readonly<Props>) {
  const { t } = useTranslation();
  const range = offerQuoteRange(quote, quoteMin);

  return (
    <Stack spacing={1}>
      <OfferMoney side={side} range={range} />
      {range.ranged && (
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }} data-testid="offer-breakdown-at">
          {t('availability.offers.ask.breakdownAt', { vars: { count: quote.pax } })}
        </Typography>
      )}
      <PriceBreakdownView breakdown={quote} hostReads={side === 'HOST'} />
    </Stack>
  );
}
