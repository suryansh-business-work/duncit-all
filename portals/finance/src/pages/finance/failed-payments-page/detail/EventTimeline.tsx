import { useQuery } from '@apollo/client/react';
import { Alert, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { StatusChip } from '@duncit/ui';
import { useTranslation, type DateFormatter } from '@duncit/app-settings';
import { parseApiError } from '@duncit/utils';
import DetailCard from './DetailCard';
import TraceLink from '../../../../components/TraceLink';
import { isTraceableId } from '../../../../lib/paymentTrace';
import { labelOf, sourceLabels } from '../labels';
import { FAILED_PAYMENT_EVENTS, type FailedPaymentEventsData, type PaymentEvent } from '../queries';

interface Props {
  caseId: string;
  formatDateTime: DateFormatter['formatDateTime'];
}

/** One timeline entry, hoisted so a re-render does not remount every row. Shared with Payment Logs' Refund area. */
export function EventRow({ event, source, formatDateTime }: Readonly<{ event: PaymentEvent; source: string; formatDateTime: Props['formatDateTime'] }>) {
  return (
    <Stack spacing={0.5} data-testid="failed-payment-event">
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{event.type}</Typography>
          <StatusChip status={event.source} label={source} />
          {event.actor_name && <Typography variant="caption">{event.actor_name}</Typography>}
        </Stack>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{formatDateTime(event.created_at)}</Typography>
      </Stack>
      {event.details.map((detail) => (
        <Typography key={detail.key} variant="caption" sx={{ color: 'text.secondary', wordBreak: 'break-word' }}>
          {detail.key}: {isTraceableId(detail.value) ? <TraceLink value={detail.value} /> : detail.value}
        </Typography>
      ))}
    </Stack>
  );
}

/**
 * Everything that happened to the payment, oldest first — the same audit trail
 * the server keeps. The page remounts it (keyed on the case revision) whenever
 * the case changes, so a decision just taken shows up without a reload.
 */
export default function EventTimeline({ caseId, formatDateTime }: Readonly<Props>) {
  const { t } = useTranslation();
  const sources = sourceLabels(t);
  const { data, loading, error } = useQuery<FailedPaymentEventsData>(FAILED_PAYMENT_EVENTS, {
    variables: { caseId },
    fetchPolicy: 'network-only',
  });
  const events = data?.failedPaymentEvents ?? [];

  return (
    <DetailCard title={t('finance.failedPayments.timelineSection')} testId="failed-payment-timeline-card">
      {loading && !data && <CircularProgress size={20} aria-label={t('finance.failedPayments.loading')} />}
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      {!loading && !error && events.length === 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t('finance.failedPayments.noEvents')}</Typography>
      )}
      <Stack spacing={1.25} divider={<Divider flexItem />}>
        {events.map((event) => (
          <EventRow key={event.id} event={event} source={labelOf(sources, event.source)} formatDateTime={formatDateTime} />
        ))}
      </Stack>
    </DetailCard>
  );
}
