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
