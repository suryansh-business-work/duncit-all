import { formatMoney } from '@duncit/utils';
import type { PayLine, TeamNode } from './types';

/** The currency's own symbol, from the structure's ISO code — nothing is hardcoded to rupees. */
export function currencySymbol(currency: string): string {
  try {
    const part = new Intl.NumberFormat(undefined, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
      .formatToParts(0)
      .find((p) => p.type === 'currency');
    return part?.value ?? currency;
  } catch {
    return currency;
  }
}

export const money = (value: number, currency: string): string =>
  formatMoney(value, { symbol: currencySymbol(currency) });

/** What one pay line shows: a range for variable pay, the amount for fixed. */
export function payLineText(line: PayLine, currency: string): string {
  if (line.kind === 'VARIABLE' && line.min_amount != null && line.max_amount != null) {
    return `${money(line.min_amount, currency)} – ${money(line.max_amount, currency)}`;
  }
  return money(line.amount, currency);
}

/** Monthly cost of the whole chart, split by employment type, from the seats' own server-computed figures. */
export function costByEmployment(nodes: readonly TeamNode[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const node of nodes) {
    if (node.monthly_cost == null || node.status === 'OPTIONAL') continue;
    totals[node.employment_type] = (totals[node.employment_type] ?? 0) + node.monthly_cost;
  }
  return totals;
}
