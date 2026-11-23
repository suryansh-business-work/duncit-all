import { useCallback } from 'react';
import { useQuery } from '@apollo/client/react';
import { useSearchParams } from 'react-router';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { parseApiError } from '@duncit/utils';
import PaymentTraceSearchForm from './payment-trace-search';
import TraceResults from './TraceResults';
import { PAYMENT_TRACE, type PaymentTraceData } from './queries';

/**
 * Finance › Payment Trace. Any id a payment goes by — our DPAY- ref, an invoice
 * number, a Razorpay payment / order / refund id — and every payment and log it
 * appears in. The id lives in the address bar (`?ref=`), so every id link in
 * the portal opens here directly, and Back steps through the trail followed.
 */
export default function PaymentTracePage() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const [params, setParams] = useSearchParams();
  const ref = (params.get('ref') ?? '').trim();
  const { data, loading, error } = useQuery<PaymentTraceData>(PAYMENT_TRACE, {
    variables: { ref },
    skip: !ref,
    // Logs grow while a payment settles; a trace always reads them fresh.
    fetchPolicy: 'network-only',
  });
  const trace = data?.paymentTrace;
  const search = useCallback((next: string) => setParams({ ref: next }), [setParams]);

  return (
    <Box>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
        <TravelExploreIcon color="primary" />
        <Typography component="h1" variant="h5" sx={{ fontWeight: 700 }}>
          {t('finance.paymentTrace.title')}
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        {t('finance.paymentTrace.subtitle')}
      </Typography>
      <Box sx={{ mb: 3 }}>
        <PaymentTraceSearchForm initialRef={ref} busy={loading} onSubmit={search} />
      </Box>
      {loading && <CircularProgress size={24} aria-label={t('finance.paymentTrace.loading')} />}
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      {!loading && !error && trace && trace.ref === ref && <TraceResults trace={trace} formatDateTime={formatDateTime} />}
    </Box>
  );
}
