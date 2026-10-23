import { Alert, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { formatStatementMoney, parseApiError, venueQuoteLines, type VenueQuote } from '@duncit/utils';
import { usePricing } from '../../../../hooks/usePricing';
import { useTranslation } from '../../../../i18n/useTranslation';
import { SURFACE_SX } from '../../../../theme';

interface Props {
  quote: VenueQuote | null;
  /** Why the offer cannot be sent, as the server put it. */
  message?: string | null;
  loading: boolean;
  error: unknown;
}

/**
 * The host's offer, priced exactly as the server quoted it: the offered base,
 * each of the venue's price rules, any min-spend top-up, its fees, taxes and
 * Duncit's fee on top — or why the offer cannot be sent. Read-only: the host
 * changes the offer, not the price. Native twin: VenueQuoteCard.
 */
export default function VenueQuoteCard({ quote, message, loading, error }: Readonly<Props>) {
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
  const { lines, total, deposit } = venueQuoteLines(quote, money);
  return (
    <Stack spacing={1} sx={{ ...SURFACE_SX, p: 2 }} data-testid="create-pod-venue-quote" aria-live="polite">
      <Typography variant="subtitle2">{t('mweb.createPod.quoteTitle')}</Typography>
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
