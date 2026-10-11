import { FULFILMENT_TONE, TONE_CHIP_COLOR, formatMoney } from '@duncit/utils';
import type { StatusColorMap } from '@duncit/ui';
import type { Translate } from '../brand-wizard/wizard-steps';
import type { OrderRow } from './orders.queries';

/** Chip colours for a fulfilment status — the shared tone, read as an MUI chip colour. */
export const ORDER_STATUS_COLORS: StatusColorMap = Object.fromEntries(
  Object.entries(FULFILMENT_TONE).map(([status, tone]) => [status, TONE_CHIP_COLOR[tone]]),
);

/** The order's total in the currency it was paid in. */
export const orderTotal = (row: Pick<OrderRow, 'total' | 'currency_symbol'>) =>
  formatMoney(row.total, { decimals: 2, symbol: row.currency_symbol || undefined });

/** "Collar × 2" for one line, "Collar × 2 +1" when there are more. */
export const orderItemsSummary = (t: Translate, row: Pick<OrderRow, 'line_items'>) => {
  const [first] = row.line_items;
  if (!first) return '—';
  const line = t('partners.orders.itemLine', { vars: { name: first.name, qty: first.qty } });
  return row.line_items.length > 1 ? t('partners.orders.itemsMore', { vars: { first: line, more: row.line_items.length - 1 } }) : line;
};

/** The refund states a filter offers — NONE (nothing owed) is the absence of a refund, not a state to filter on. */
export const REFUND_STATUSES = ['PENDING', 'PROCESSED', 'RECORDED', 'FAILED'] as const;

/** Chip colours for a refund: done is green, failed is red, in flight is amber. */
export const REFUND_STATUS_COLORS: StatusColorMap = {
  NONE: 'default',
  PENDING: 'warning',
  PROCESSED: 'success',
  RECORDED: 'info',
  FAILED: 'error',
};

export function refundStatusLabel(status: string, t: Translate): string {
  switch (status) {
    case 'PENDING':
      return t('partners.orders.refundPending');
    case 'PROCESSED':
      return t('partners.orders.refundProcessed');
    case 'RECORDED':
      return t('partners.orders.refundRecorded');
    case 'FAILED':
      return t('partners.orders.refundFailed');
    default:
      return t('partners.orders.refundNone');
  }
}

/** The cash going back, in the order's currency. */
export const refundAmount = (row: Pick<OrderRow, 'refund' | 'currency_symbol'>) =>
  formatMoney(row.refund.amount, { decimals: 2, symbol: row.currency_symbol || undefined });
