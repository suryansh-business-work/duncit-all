import { Chip } from '@mui/material';
import { EM_DASH, type DuncitColumn } from '@duncit/table';
import type { Translator } from '@duncit/app-settings';
import type { RefundGatewayStatus, UserRefundRow } from './queries';

type ChipColor = 'default' | 'info' | 'success' | 'warning' | 'error';

/**
 * Each Razorpay refund state: its label key, written out whole so the
 * translation gate can see it, and the tone of its chip. Accepted by Razorpay
 * is not refunded — only SUCCEEDED means the money went back.
 */
const STATE: Record<RefundGatewayStatus, { label: string; color: ChipColor }> = {
  REQUESTED: { label: 'finance.refundLogs.gatewayRequested', color: 'info' },
  PROCESSING: { label: 'finance.refundLogs.gatewayProcessing', color: 'warning' },
  SUCCEEDED: { label: 'finance.refundLogs.gatewaySucceeded', color: 'success' },
  FAILED: { label: 'finance.refundLogs.gatewayFailed', color: 'error' },
  RECONCILIATION_REQUIRED: { label: 'finance.refundLogs.gatewayReconcile', color: 'error' },
  NOT_APPLICABLE: { label: 'finance.refundLogs.gatewayNotApplicable', color: 'default' },
};

/**
 * The User Refund Logs column for where the refund's money stands at Razorpay.
 * The server derives it, so there is no stored path to sort or filter on; a
 * refund recorded before refunds went through Razorpay reads as a dash.
 */
export function refundStatusColumn(t: Translator['t']): DuncitColumn<UserRefundRow> {
  const labelOf = (r: UserRefundRow) => (r.refund_status ? t(STATE[r.refund_status].label) : EM_DASH);
  return {
    field: 'refund_status',
    headerName: t('finance.refundLogs.colGatewayStatus'),
    width: 150,
    type: 'text',
    sortable: false,
    filterable: false,
    cellRenderer: (r) =>
      r.refund_status ? (
        <Chip size="small" variant="outlined" color={STATE[r.refund_status].color} label={labelOf(r)} />
      ) : (
        EM_DASH
      ),
    valueGetter: labelOf,
  };
}
