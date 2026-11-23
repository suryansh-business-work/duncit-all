import { Chip } from '@mui/material';
import type { Translator } from '@duncit/app-settings';
import { EM_DASH, type DuncitColumn } from '@duncit/table';
import type { PaymentRow } from './queries';

type T = Translator['t'];

/** What a payment's refund is doing, in the five states a reader tells apart. */
export type RefundState = 'REFUNDED' | 'PART_REFUNDED' | 'PROCESSING' | 'PENDING' | 'ATTENTION';

type RefundFacts = Pick<PaymentRow, 'status' | 'refund_status' | 'needs_refund'>;

/**
 * The refund state of one payment, or null when it has no refund to speak of.
 * The same rules the Payment Logs PDF prints (payment.logsPdf.words on the
 * server), so the page and its printout never name one refund two ways:
 *  - Razorpay confirmed it: Refunded, or Part refunded while the payment is still SUCCESS;
 *  - Razorpay accepted it, the bank has not: Processing;
 *  - recorded but not sent yet, or a capture that bought nothing and is still owed: Pending;
 *  - Razorpay refused it, or the retries are used up: Needs attention (Finance must act).
 */
export function refundStateOf(p: RefundFacts): RefundState | null {
  switch (p.refund_status ?? '') {
    case 'SUCCEEDED':
      return p.status === 'SUCCESS' ? 'PART_REFUNDED' : 'REFUNDED';
    case 'PROCESSING':
      return 'PROCESSING';
    case 'REQUESTED':
      return 'PENDING';
    case 'FAILED':
    case 'RECONCILIATION_REQUIRED':
      return 'ATTENTION';
    default:
      break;
  }
  if (p.needs_refund) return 'PENDING';
  // An older refund (or one with no gateway money to send) carries only the status.
  return p.status === 'REFUNDED' ? 'REFUNDED' : null;
}

/** Theme palette colours only: done is green, owed or on its way is yellow, refused is red. */
const COLORS: Record<RefundState, 'success' | 'info' | 'warning' | 'error'> = {
  REFUNDED: 'success',
  PART_REFUNDED: 'info',
  PROCESSING: 'warning',
  PENDING: 'warning',
  ATTENTION: 'error',
};

/** Each key a literal, so the localization gate sees it rendered. */
export const refundStateLabels = (t: T): Record<RefundState, string> => ({
  REFUNDED: t('finance.payment.refundStateRefunded'),
  PART_REFUNDED: t('finance.payment.refundStatePart'),
  PROCESSING: t('finance.payment.refundStateProcessing'),
  PENDING: t('finance.payment.refundStatePending'),
  ATTENTION: t('finance.payment.refundStateAttention'),
});

/** The Refund column: the state as a chip, a dash for a payment with no refund. */
export function refundColumn(t: T): DuncitColumn<PaymentRow> {
  const labels = refundStateLabels(t);
  const label = (p: PaymentRow) => {
    const state = refundStateOf(p);
    return state ? labels[state] : EM_DASH;
  };
  return {
    // Derived from the status and the refund engine's mirror, so it has no column of its own to sort or filter by.
    field: 'refund_status',
    headerName: t('finance.payment.colRefund'),
    width: 170,
    type: 'text',
    sortable: false,
    filterable: false,
    cellRenderer: (p) => {
      const state = refundStateOf(p);
      return state ? <Chip size="small" variant="outlined" color={COLORS[state]} label={labels[state]} /> : EM_DASH;
    },
    valueGetter: label,
  };
}
