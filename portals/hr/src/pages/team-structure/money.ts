import { formatMoney } from '@duncit/utils';
import type { TeamNode } from './types';

/** The currency's own symbol, from the structure's ISO code — nothing is hardcoded to rupees. */
export function currencySymbol(currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
      .formatToParts(0)
      .filter((p) => p.type === 'currency')
      .map((p) => p.value)
      .join('');
  } catch {
    return currency;
  }
}

export const money = (value: number, currency: string): string =>
  formatMoney(value, { symbol: currencySymbol(currency) });

/** Monthly cost of the whole chart, split by employment type, from the seats' own server-computed figures. */
export function costByEmployment(nodes: readonly TeamNode[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const node of nodes) {
    if (node.monthly_cost == null || node.status === 'OPTIONAL') continue;
    totals[node.employment_type] = (totals[node.employment_type] ?? 0) + node.monthly_cost;
  }
  return totals;
}
