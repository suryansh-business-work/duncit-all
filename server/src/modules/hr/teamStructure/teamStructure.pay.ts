import type { IPayComponent } from './teamStructure.model';

/** Monthly value of one pay line; per-unit lines depend on volume, so they are not budgeted. */
function monthlyOf(line: IPayComponent): number {
  if (line.frequency === 'PER_UNIT') return 0;
  return line.frequency === 'ANNUAL' ? line.amount / 12 : line.amount;
}

/** Fixed pay plus the expected figure of variable pay, per month, rounded to paise. */
export function monthlyCost(pay: readonly IPayComponent[]): number {
  const total = pay.reduce((sum, line) => sum + monthlyOf(line), 0);
  return Math.round(total * 100) / 100;
}

/** Rejects a variable line whose range does not bracket its expected amount. */
export function payProblem(line: IPayComponent): string | null {
  if (line.kind === 'FIXED') return null;
  const { min_amount: min, max_amount: max, amount } = line;
  if (min == null || max == null) return `${line.label}: a variable line needs both a minimum and a maximum`;
  if (min > max || amount < min || amount > max) return `${line.label}: expected amount must sit between minimum and maximum`;
  return null;
}
