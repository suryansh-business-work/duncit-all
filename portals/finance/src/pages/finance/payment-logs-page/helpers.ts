import { formatMoney } from '@duncit/utils';

export const STATUS_COLORS: Record<
  string,
  'default' | 'warning' | 'info' | 'success' | 'error'
> = {
  PENDING: 'warning',
  SUCCESS: 'success',
  FAILED: 'error',
  REFUNDED: 'info',
};

export const fmt = (n: number, sym = '₹') => formatMoney(n, { symbol: sym, decimals: 2, grouping: false });

/** Maps the table's query state to PaymentFilterInput so the KPI totals track
 * the table's search/status filter (only fields the input supports). */
export function paymentTableFilter(q: {
  search: string;
  filters: { field: string; op: string; value?: string }[];
}): { search?: string; status?: string } | undefined {
  const filter: { search?: string; status?: string } = {};
  const search = q.search.trim();
  if (search) filter.search = search;
  const status = q.filters.find((f) => f.field === 'status' && f.op === 'eq')?.value;
  if (status) filter.status = status;
  return Object.keys(filter).length ? filter : undefined;
}
