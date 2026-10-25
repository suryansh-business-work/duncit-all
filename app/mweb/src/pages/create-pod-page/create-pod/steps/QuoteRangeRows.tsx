import { Divider, Stack, Typography } from '@mui/material';
import { moneyRangeText, offerQuoteRange, type VenueQuote } from '@duncit/utils';
import { useTranslation } from '../../../../i18n/useTranslation';

interface Props {
  /** The offer priced at the pod's spots — the most guests. */
  quote: VenueQuote;
  /** The same offer priced at the venue's minimum guests — the fewest. */
  quoteMin: VenueQuote | null;
  money: (rupees: number) => string;
}

function RangeRow({ label, value, testId }: Readonly<{ label: string; value: string; testId: string }>) {
  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 700 }} data-testid={testId}>{value}</Typography>
    </Stack>
  );
}

/**
 * A per-guest offer is paid for at least the venue's minimum guests and at
 * most the pod's spots, so what the venue receives and what the booking costs
 * the pod read as ranges, fewest guests first — then the breakdown below is
 * named as the one at the most guests. Nothing is drawn when both ends are the
 * same money (any other pricing option, or no minimum below the spots).
 * Native twin: QuoteRangeRows.
 */
export default function QuoteRangeRows({ quote, quoteMin, money }: Readonly<Props>) {
  const { t } = useTranslation();
  const range = offerQuoteRange(quote, quoteMin);
  if (!quoteMin || !range.ranged) return null;
  return (
    <Stack spacing={0.75} data-testid="create-pod-quote-range">
      <RangeRow
        label={t('availability.offers.ask.venueReceives')}
        value={moneyRangeText(range.venueMin, range.venueMax, money)}
        testId="create-pod-quote-venue-range"
      />
      <RangeRow
        label={t('availability.offers.ask.podCost')}
        value={moneyRangeText(range.totalMin, range.totalMax, money)}
        testId="create-pod-quote-total-range"
      />
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('availability.offers.ask.range', { vars: { min: quoteMin.pax, max: quote.pax } })}
      </Typography>
      <Divider />
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
        {t('availability.offers.ask.breakdownAt', { vars: { count: quote.pax } })}
      </Typography>
    </Stack>
  );
}
