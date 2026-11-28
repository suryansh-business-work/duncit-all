import { formatCurrency } from '@duncit/utils';
import type { TeamNode } from './types';

export { currencySymbol } from '@duncit/utils';

export const money = (value: number, currency: string): string => formatCurrency(value, currency);

/** Monthly cost of the whole chart, split by employment type, from the seats' own server-computed figures. */
export function costByEmployment(nodes: readonly TeamNode[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const node of nodes) {
    if (node.monthly_cost == null || node.status === 'OPTIONAL') continue;
    totals[node.employment_type] = (totals[node.employment_type] ?? 0) + node.monthly_cost;
  }
  return totals;
}
