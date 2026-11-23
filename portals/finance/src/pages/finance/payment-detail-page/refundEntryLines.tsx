import type { ReactNode } from 'react';
import { Typography } from '@mui/material';
import type { DateFormatter, Translator } from '@duncit/app-settings';
import { tracedId } from '../../../components/TraceLink';
import { labelOf } from '../failed-payments-page/labels';
import { money, type PaymentRefundEntry } from './queries';
import { refundSourceLabels } from './refundLabels';

export interface EntryLine {
  label: string;
  value: ReactNode;
}

interface Context {
  t: Translator['t'];
  currencySymbol: string;
  formatDateTime: DateFormatter['formatDateTime'];
}

/** A line only when it has something to say, so an empty field never prints a dash. */
const optional = (label: string, value: ReactNode): EntryLine[] =>
  value === null || value === undefined || value === '' ? [] : [{ label, value }];

/** Every Razorpay refund id behind the row; the primary one stands in when the list is empty. */
export const refundIdsOf = (entry: PaymentRefundEntry): string[] => {
  if (entry.razorpay_refund_ids.length > 0) return entry.razorpay_refund_ids;
  return entry.razorpay_refund_id ? [entry.razorpay_refund_id] : [];
};

/** One line per refund id, numbered only when there are several so each keeps its own label. */
function refundIdLines(entry: PaymentRefundEntry, t: Translator['t']): EntryLine[] {
  const ids = refundIdsOf(entry);
  const base = t('finance.payment.idRazorpayRefund');
  return ids.map((id, index) => ({ label: ids.length > 1 ? `${base} ${index + 1}` : base, value: tracedId(id) }));
}

/**
 * The label/value lines of one refund (its status is the chip above them).
 * Every Razorpay id is a link into Payment Trace — they are what Finance
 * compares with the Razorpay dashboard.
 */
export function buildEntryLines(entry: PaymentRefundEntry, { t, currencySymbol, formatDateTime }: Readonly<Context>): EntryLine[] {
  const when = (iso: string | null) => (iso ? formatDateTime(iso) : null);
  return [
    ...optional(t('finance.payment.refundArea.entryRef'), entry.ref),
    { label: t('finance.payment.refundArea.entrySource'), value: labelOf(refundSourceLabels(t), entry.source) },
    ...optional(t('finance.payment.refundArea.entryAmount'), entry.amount > 0 ? money(currencySymbol, entry.amount) : null),
    ...optional(t('finance.payment.refundArea.entryCoins'), entry.coins > 0 ? entry.coins : null),
    ...refundIdLines(entry, t),
    ...optional(t('finance.payment.idRazorpayPayment'), tracedId(entry.razorpay_payment_id)),
    ...optional(t('finance.payment.refundArea.entryInitiatedBy'), entry.initiated_by),
    ...optional(t('finance.payment.refundArea.entryReason'), entry.reason),
    ...optional(
      t('finance.payment.refundArea.entryError'),
      entry.error ? <Typography variant="body2" sx={{ color: 'error.main' }}>{entry.error}</Typography> : null,
    ),
    ...optional(t('finance.payment.refundArea.entryAttempts'), entry.attempts > 0 ? entry.attempts : null),
    ...optional(t('finance.payment.refundArea.entryRequestedAt'), when(entry.requested_at)),
    ...optional(t('finance.payment.refundArea.entryProcessedAt'), when(entry.processed_at)),
    ...optional(t('finance.payment.refundArea.entryDueAt'), when(entry.due_at)),
  ];
}
