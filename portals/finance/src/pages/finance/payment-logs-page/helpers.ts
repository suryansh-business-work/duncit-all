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

/** The one status a status filter pins, or undefined when it pins none or several. */
function singleStatus(f: { op: string; value?: string; values?: string[] } | undefined): string | undefined {
  if (f?.op === 'eq') return f.value;
  if (f?.op === 'in' && f.values?.length === 1) return f.values[0];
  return undefined;
}

/** Maps the table's query state to PaymentFilterInput so the KPI totals track
 * the table's search/status filter (only fields the input supports). */
export function paymentTableFilter(q: {
  search: string;
  filters: { field: string; op: string; value?: string; values?: string[] }[];
}): { search?: string; status?: string } | undefined {
  const filter: { search?: string; status?: string } = {};
  const search = q.search.trim();
  if (search) filter.search = search;
  // The enum filter sends `in`; the totals input takes ONE status, so only a
  // single picked status narrows the cards.
  const status = singleStatus(q.filters.find((f) => f.field === 'status'));
  if (status) filter.status = status;
  return Object.keys(filter).length ? filter : undefined;
}
