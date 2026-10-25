import { Stack, Typography } from '@mui/material';
import { formatStatementMoney, moneyRangeText, offerQuoteRange, type VenueQuote } from '@duncit/utils';
import { useTranslation } from '../i18n/useTranslation';

interface Props {
  /** The offer priced at the pod's spots — the most guests. */
  quote: VenueQuote;
  /** The same offer priced at the venue's minimum guests (null: none priced). */
  quoteMin: VenueQuote | null;
  currency: string;
}

function RangeRow({ label, value, testId }: Readonly<{ label: string; value: string; testId: string }>) {
  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
      <Typography variant="body2">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 700 }} data-testid={testId}>
        {value}
      </Typography>
    </Stack>
  );
}

/**
 * What the offer comes to, as the server priced it. A per-guest offer is paid
 * for at least the venue's minimum guests and at most the pod's spots, so what
 * the venue receives and what the booking costs the pod read as ranges, fewest
 * guests first; any offer priced the same at both ends reads as one total.
 * mWeb twin: QuoteRangeRows.
 */
export default function OfferQuoteSummary({ quote, quoteMin, currency }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = (rupees: number) => formatStatementMoney(rupees, currency);
  const range = offerQuoteRange(quote, quoteMin);
  if (!quoteMin || !range.ranged) {
    return (
      <Typography variant="body2" data-testid="pod-form-offer-total" sx={{ fontWeight: 700 }}>
        {t('podForm.offer.total', { vars: { amount: money(quote.total) } })}
      </Typography>
    );
  }
  return (
    <Stack spacing={0.5} data-testid="pod-form-offer-range" aria-live="polite">
      <RangeRow
        label={t('availability.offers.ask.venueReceives')}
        value={moneyRangeText(range.venueMin, range.venueMax, money)}
        testId="pod-form-offer-venue-range"
      />
      <RangeRow
        label={t('availability.offers.ask.podCost')}
        value={moneyRangeText(range.totalMin, range.totalMax, money)}
        testId="pod-form-offer-total-range"
      />
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('availability.offers.ask.range', { vars: { min: quoteMin.pax, max: quote.pax } })}
      </Typography>
    </Stack>
  );
}
