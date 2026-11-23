import { appDate } from '@utils/app-time';
import type { TableFilterInput, TableQueryInput } from '@utils/table-query';

/**
 * The plain words the Payment Logs PDF prints. Kept apart from the drawing so
 * they can be read (and tested) without a PDF: the same five refund words and
 * four status words are what the Payment Logs table shows on screen, so the
 * page and its printout never name one payment two ways.
 */

/** The fields of a payment row the printout reads. */
export interface PaymentLogRow {
  id: string;
  payment_id: string;
  user_name: string;
  user_email: string;
  description: string;
  total: number;
  currency_symbol: string;
  status: string;
  refund_status?: string | null;
  needs_refund?: boolean | null;
  razorpay_payment_id?: string | null;
  created_at: string;
}

/** The most rows one PDF carries, however many the filter matches. */
export const PAYMENT_LOGS_PDF_MAX_ROWS = 2000;

const humanize = (text: string): string => {
  const spaced = text.toLowerCase().replaceAll('_', ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const STATUS_WORDS: Record<string, string> = {
  PENDING: 'Pending',
  SUCCESS: 'Paid',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
};

/** A payment's status in the words a reader uses: SUCCESS is "Paid". */
export const paymentStatusWord = (status: string): string => STATUS_WORDS[status] ?? humanize(status);

const GATEWAY_REFUND_WORDS: Record<string, string> = {
  REQUESTED: 'Refund pending',
  PROCESSING: 'Refund processing',
  FAILED: 'Refund needs attention',
  RECONCILIATION_REQUIRED: 'Refund needs attention',
};

/** Where a refund sent to Razorpay ended up, for a payment whose money is back. */
function settledRefundWord(row: Pick<PaymentLogRow, 'status'>): string {
  // Only a release of the whole booking flips the status; a SUCCESS payment with a paid refund gave part back.
  return row.status === 'SUCCESS' ? 'Part refunded' : 'Refunded';
}

/**
 * What state a payment's refund is in, in one phrase — empty when there is no
 * refund to talk about. `needs_refund` is a capture that bought nothing and is
 * still owed back, so it reads as pending until the money has gone.
 */
export function paymentRefundWord(row: Pick<PaymentLogRow, 'status' | 'refund_status' | 'needs_refund'>): string {
  const gateway = row.refund_status ?? '';
  if (gateway === 'SUCCEEDED') return settledRefundWord(row);
  const fromGateway = GATEWAY_REFUND_WORDS[gateway];
  if (fromGateway) return fromGateway;
  if (row.needs_refund) return 'Refund pending';
  return row.status === 'REFUNDED' ? 'Refunded' : '';
}

const FIELD_LABELS: Record<string, string> = {
  created_at: 'Date',
  paid_at: 'Paid on',
  user_name: 'Customer',
  user_email: 'Email',
  description: 'What for',
  total: 'Amount',
  subtotal: 'Subtotal',
  status: 'Status',
  gateway: 'Gateway',
  payment_id: 'Payment ID',
  target_type: 'Checkout',
};

const ISO_DAY = /^\d{4}-\d{2}-\d{2}/;

function describeValue(field: string, value: string): string {
  if (field === 'status') return paymentStatusWord(value);
  return ISO_DAY.test(value) ? appDate(value) : value;
}

const valuesOf = (filter: TableFilterInput): string[] => {
  if (filter.values?.length) return filter.values;
  return filter.value == null ? [] : [filter.value];
};

/** One table filter as a short phrase: `Status: Paid, Refunded`, `Amount: from 100`. */
export function describeFilter(filter: TableFilterInput): string {
  const label = FIELD_LABELS[filter.field] ?? humanize(filter.field);
  const values = valuesOf(filter).map((value) => describeValue(filter.field, value));
  const joined = values.join(', ');
  switch (filter.op) {
    case 'is_true':
      return `${label}: yes`;
    case 'is_false':
      return `${label}: no`;
    case 'between':
      return `${label}: ${values[0] ?? ''} to ${values[1] ?? ''}`;
    case 'gte':
      return `${label}: from ${joined}`;
    case 'lte':
      return `${label}: up to ${joined}`;
    case 'ne':
      return `${label}: not ${joined}`;
    case 'contains':
      return `${label}: contains ${joined}`;
    default:
      return `${label}: ${joined}`;
  }
}

/** The search and filters behind a printout, on one line — "None" when it is every payment. */
export function describeQuery(query?: TableQueryInput | null): string {
  const parts: string[] = [];
  const search = query?.search?.trim();
  if (search) parts.push(`Search "${search}"`);
  for (const filter of query?.filters ?? []) parts.push(describeFilter(filter));
  return parts.length ? parts.join('  ·  ') : 'None (every payment)';
}

/** The line that says a long list was cut, or null when every matching payment is on the page. */
export function capLine(shown: number, total: number): string | null {
  if (total <= shown) return null;
  return `Showing the first ${shown} of ${total} payments. Narrow the search or filters to print the rest.`;
}

export interface CurrencyTotals {
  symbol: string;
  paid_count: number;
  paid: number;
  refunded_count: number;
  refunded: number;
  failed_count: number;
  pending_count: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Totals over the rows printed, one entry per currency (a log is one currency
 * in practice, but two must never be added together). Paid is money captured
 * and still held (status SUCCESS); Refunded is the payments flipped to
 * REFUNDED, at their full total.
 */
export function totalsOf(rows: readonly PaymentLogRow[]): CurrencyTotals[] {
  const bySymbol = new Map<string, CurrencyTotals>();
  for (const row of rows) {
    const entry = bySymbol.get(row.currency_symbol) ?? {
      symbol: row.currency_symbol,
      paid_count: 0,
      paid: 0,
      refunded_count: 0,
      refunded: 0,
      failed_count: 0,
      pending_count: 0,
    };
    if (row.status === 'SUCCESS') {
      entry.paid_count += 1;
      entry.paid = round2(entry.paid + row.total);
    } else if (row.status === 'REFUNDED') {
      entry.refunded_count += 1;
      entry.refunded = round2(entry.refunded + row.total);
    } else if (row.status === 'FAILED') {
      entry.failed_count += 1;
    } else {
      entry.pending_count += 1;
    }
    bySymbol.set(row.currency_symbol, entry);
  }
  return [...bySymbol.values()];
}
