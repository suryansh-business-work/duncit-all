import type { ReactNode } from 'react';
import { Stack, Typography } from '@mui/material';
import { EM_DASH, type DuncitColumn } from '@duncit/table';
import { formatDateTime, type Translator } from '@duncit/app-settings';
import { StatusChip } from '@duncit/ui';
import { fmt } from '../payment-logs-page/helpers';
import {
  REFUND_COLORS,
  RESOLUTION_COLORS,
  VERIFICATION_COLORS,
  asOptions,
  labelOf,
  refundLabels,
  resolutionLabels,
  reviewLabels,
  verificationLabels,
} from './labels';
import type { FailedPaymentRow } from './queries';

type T = Translator['t'];

const dateText = (iso: string | null | undefined) => (iso ? formatDateTime(iso) || EM_DASH : EM_DASH);

/** Two lines: a strong first value and a muted second one (either may be missing). */
function twoLine(first: string, second: string | null | undefined, mono = false): ReactNode {
  return (
    <Stack component="span" sx={{ lineHeight: 1.2 }}>
      <Typography variant="body2" component="span" sx={{ fontWeight: 600, fontFamily: mono ? 'monospace' : undefined }}>
        {first || EM_DASH}
      </Typography>
      {second && (
        <Typography variant="caption" component="span" sx={{ color: 'text.secondary', fontFamily: mono ? 'monospace' : undefined }}>
          {second}
        </Typography>
      )}
    </Stack>
  );
}

/**
 * Finance › Failed Payments columns. Only the fields the server allowlists sort
 * or filter; the rest are read-only views of the case. `renderActions` decides
 * per row (and per viewer) which decisions are offered.
 */
export function buildFailedPaymentColumns(
  t: T,
  renderActions: (row: FailedPaymentRow) => ReactNode,
): DuncitColumn<FailedPaymentRow>[] {
  const verification = verificationLabels(t);
  const resolution = resolutionLabels(t);
  const refund = refundLabels(t);
  const review = reviewLabels(t);

  return [
    { field: 'created_at', headerName: t('finance.failedPayments.colCreated'), width: 170, type: 'date', valueGetter: (r) => dateText(r.created_at) },
    {
      field: 'user_name',
      headerName: t('finance.failedPayments.colUser'),
      flex: 1,
      minWidth: 180,
      type: 'text',
      filterable: false,
      cellRenderer: (r) => twoLine(r.user_name, r.user_phone || r.user_email),
      valueGetter: (r) => [r.user_name, r.user_phone, r.user_email].filter(Boolean).join(' '),
    },
    { field: 'pod_title', headerName: t('finance.failedPayments.colPod'), minWidth: 160, type: 'text', sortable: false, filterable: false, valueGetter: (r) => r.pod_title || EM_DASH },
    { field: 'amount', headerName: t('finance.failedPayments.colAmount'), width: 120, type: 'number', filterable: false, valueGetter: (r) => fmt(r.amount, r.currency_symbol) },
    {
      field: 'razorpay_payment_id',
      headerName: t('finance.failedPayments.colRazorpay'),
      minWidth: 190,
      type: 'text',
      sortable: false,
      filterable: false,
      cellRenderer: (r) => twoLine(r.razorpay_payment_id ?? '', r.razorpay_order_id, true),
      valueGetter: (r) => [r.razorpay_payment_id, r.razorpay_order_id].filter(Boolean).join(' '),
    },
    {
      field: 'error_code',
      headerName: t('finance.failedPayments.colError'),
      minWidth: 200,
      type: 'text',
      sortable: false,
      filterable: false,
      cellRenderer: (r) => twoLine(r.error_code ?? '', r.error_description),
      valueGetter: (r) => [r.error_code, r.error_description].filter(Boolean).join(' '),
    },
    { field: 'attempts', headerName: t('finance.failedPayments.colAttempts'), width: 110, type: 'number', filterable: false, valueGetter: (r) => r.attempts },
    { field: 'claim_count', headerName: t('finance.failedPayments.colClaims'), width: 110, type: 'number', sortable: false, filterable: false, valueGetter: (r) => r.claim_count },
    {
      field: 'verification_status',
      headerName: t('finance.failedPayments.colVerification'),
      width: 160,
      type: 'enum',
      sortable: false,
      options: asOptions(verification),
      cellRenderer: (r) => <StatusChip status={r.verification_status} label={labelOf(verification, r.verification_status)} colorMap={VERIFICATION_COLORS} />,
      valueGetter: (r) => labelOf(verification, r.verification_status),
    },
    {
      field: 'review_decision',
      headerName: t('finance.failedPayments.colReview'),
      width: 130,
      type: 'enum',
      sortable: false,
      options: asOptions(review),
      valueGetter: (r) => labelOf(review, r.review_decision) || EM_DASH,
    },
    {
      field: 'refund_status',
      headerName: t('finance.failedPayments.colRefund'),
      width: 170,
      type: 'enum',
      sortable: false,
      options: asOptions(refund),
      cellRenderer: (r) => (
        <Stack component="span" direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <StatusChip status={r.refund_status} label={labelOf(refund, r.refund_status)} colorMap={REFUND_COLORS} />
          {r.refund_amount != null && <Typography variant="caption">{fmt(r.refund_amount, r.currency_symbol)}</Typography>}
        </Stack>
      ),
      valueGetter: (r) => labelOf(refund, r.refund_status),
    },
    {
      field: 'resolution_state',
      headerName: t('finance.failedPayments.colResolution'),
      width: 160,
      type: 'enum',
      sortable: false,
      options: asOptions(resolution),
      cellRenderer: (r) => <StatusChip status={r.resolution_state} label={labelOf(resolution, r.resolution_state)} colorMap={RESOLUTION_COLORS} />,
      valueGetter: (r) => labelOf(resolution, r.resolution_state),
    },
    { field: 'ticket_no', headerName: t('finance.failedPayments.colTicket'), width: 130, type: 'text', sortable: false, filterable: false, valueGetter: (r) => r.ticket_no || EM_DASH },
    { field: 'updated_at', headerName: t('finance.failedPayments.colUpdated'), width: 170, type: 'date', hide: true, valueGetter: (r) => dateText(r.updated_at) },
    { field: 'actions', headerName: t('shell.common.actions'), type: 'actions', width: 150, cellRenderer: renderActions },
  ];
}
