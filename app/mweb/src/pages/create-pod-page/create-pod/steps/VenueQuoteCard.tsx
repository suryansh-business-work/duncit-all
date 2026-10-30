import { Alert, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { formatStatementMoney, parseApiError, venueQuoteLines, type VenueQuote } from '@duncit/utils';
import { usePricing } from '../../../../hooks/usePricing';
import { useTranslation } from '../../../../i18n/useTranslation';
import { SURFACE_SX } from '../../../../theme';
import QuoteRangeRows from './QuoteRangeRows';

interface Props {
  quote: VenueQuote | null;
  /** The same offer priced at the venue's minimum guests (null: none asked). */
  quoteMin?: VenueQuote | null;
  /** Why the offer cannot be sent, as the server put it. */
  message?: string | null;
  loading: boolean;
  error: unknown;
  /** The host asks for the venue free: once the server has checked the offer, it says so instead of a price. */
  free?: boolean;
}

/**
 * The host's offer, priced exactly as the server quoted it: what the venue
 * receives and what it costs the pod as a range from the venue's minimum
 * guests to the pod's spots (when those differ), then the breakdown at the
 * spots — the offered base, each of the venue's price rules, any min-spend
 * top-up, its fees, taxes and Duncit's fee on top — or why the offer cannot be
 * sent. A free venue's all-zero quote reads as one line, never a row of zeros.
 * Read-only: the host changes the offer, not the price. Native twin:
 * VenueQuoteCard.
 */
export default function VenueQuoteCard({ quote, quoteMin = null, message, loading, error, free = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const { currency } = usePricing();
  const money = (value: number) => formatStatementMoney(value, currency);

  if (error) {
    return (
      <Alert severity="warning" data-testid="create-pod-quote-error">
        {parseApiError(error) || t('mweb.createPod.quoteFailed')}
      </Alert>
    );
  }
  if (message) {
    return (
      <Alert severity="warning" data-testid="create-pod-offer-problem">
        {message}
      </Alert>
    );
  }
  if (!quote) {
    return loading ? <CircularProgress size={20} aria-label={t('mweb.a11y.loading')} /> : null;
  }
  if (free) {
    return (
      <Typography variant="body2" sx={{ ...SURFACE_SX, p: 2 }} data-testid="create-pod-venue-quote-free" aria-live="polite">
        {t('mweb.createPod.offer.freeQuote')}
      </Typography>
    );
  }
  const { lines, total, deposit } = venueQuoteLines(quote, money);
  return (
    <Stack spacing={1} sx={{ ...SURFACE_SX, p: 2 }} data-testid="create-pod-venue-quote" aria-live="polite">
      <Typography variant="subtitle2">{t('mweb.createPod.quoteTitle')}</Typography>
      <QuoteRangeRows quote={quote} quoteMin={quoteMin} money={money} />
      {lines.map((line) => (
        <Stack key={line.id} direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {line.label ?? t(line.labelKey, { vars: line.vars })}
          </Typography>
          <Typography variant="body2">{money(line.amount)}</Typography>
        </Stack>
      ))}
      <Divider />
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>{t('mweb.createPod.quote.total')}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 700 }} data-testid="create-pod-venue-quote-total">
          {money(total)}
        </Typography>
      </Stack>
      {deposit > 0 && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('mweb.createPod.quote.deposit', { vars: { amount: money(deposit) } })}
        </Typography>
      )}
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('mweb.createPod.quoteHint')}</Typography>
    </Stack>
  );
}
