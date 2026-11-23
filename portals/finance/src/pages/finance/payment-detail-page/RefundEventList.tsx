import { Box, Divider, Stack, Typography } from '@mui/material';
import { useTranslation, type DateFormatter } from '@duncit/app-settings';
import { EventRow } from '../failed-payments-page/detail/EventTimeline';
import { labelOf, sourceLabels } from '../failed-payments-page/labels';
import type { PaymentRefundSection } from './queries';

interface Props {
  events: PaymentRefundSection['events'];
  formatDateTime: DateFormatter['formatDateTime'];
}

/**
 * What happened to this kind of refund, oldest first — the payment's own audit
 * trail (who asked, what Razorpay answered, the note Finance left). Renders
 * nothing for a kind with no activity yet rather than an empty heading.
 */
export default function RefundEventList({ events, formatDateTime }: Readonly<Props>) {
  const { t } = useTranslation();
  const sources = sourceLabels(t);
  if (events.length === 0) return null;

  return (
    <Box data-testid="payment-refund-events" sx={{ mt: 2 }}>
      <Typography component="h4" variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        {t('finance.payment.refundArea.activityTitle')}
      </Typography>
      <Stack spacing={1.25} divider={<Divider flexItem />}>
        {events.map((event) => (
          <EventRow key={event.id} event={event} source={labelOf(sources, event.source)} formatDateTime={formatDateTime} />
        ))}
      </Stack>
    </Box>
  );
}
