import { useNavigate } from 'react-router-dom';
import { Alert, AlertTitle, Box, IconButton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { StatusChip } from '@duncit/ui';
import type { DateFormatter } from '@duncit/app-settings';
import { STATUS_COLORS } from '../payment-logs-page/helpers';
import type { PaymentDetail } from './queries';

interface FinalizeWarning {
  title: string;
  body: string;
}

/**
 * The two finalize states Finance has to act on. NOT_STARTED and COMPLETE are
 * absent on purpose — a lookup keyed on the state keeps this a single map read
 * instead of a chain of conditionals.
 */
const FINALIZE_WARNINGS: Record<string, FinalizeWarning> = {
  FAILED: {
    title: 'Checkout finalization failed',
    body: 'Part of what this payment was supposed to create was never written. Check the pipeline steps below, then re-run or refund.',
  },
  CORE_DONE: {
    title: 'Still finishing',
    body: 'The booking itself was written, but the follow-up work (invoice PDF, receipt email, shipment) has not all completed yet.',
  },
};

interface Props {
  detail: PaymentDetail;
  formatDateTime: DateFormatter['formatDateTime'];
}

/** Identity line + the loud states: refund-required and a stalled/failed finalize. */
export default function PaymentDetailHeader({ detail, formatDateTime }: Readonly<Props>) {
  const navigate = useNavigate();
  const p = detail.payment;
  const warning = FINALIZE_WARNINGS[detail.finalize_state];
  const paidAt = p.paid_at ? formatDateTime(p.paid_at) : 'not paid';

  return (
    <Box sx={{ mb: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <IconButton aria-label="Back to Payment Logs" onClick={() => navigate('/payment-logs')}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
            <Typography variant="h5" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
              {p.payment_id}
            </Typography>
            <StatusChip status={p.status} colorMap={STATUS_COLORS} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {p.invoice_no ?? 'No invoice number'} · {p.gateway} · {paidAt}
          </Typography>
        </Box>
      </Stack>

      {detail.needs_refund && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <AlertTitle>Refund required</AlertTitle>
          Money was captured but the booking could not be written. Nothing was created for this
          customer — refund this payment.
        </Alert>
      )}

      {warning && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <AlertTitle>{warning.title}</AlertTitle>
          {warning.body}
          {detail.finalize_error && (
            <Typography variant="caption" component="div" sx={{ mt: 1, fontFamily: 'monospace' }}>
              {detail.finalize_error}
            </Typography>
          )}
        </Alert>
      )}
    </Box>
  );
}
