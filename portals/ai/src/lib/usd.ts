import { formatMoney } from '@duncit/utils';
import { formatDateTime } from '@duncit/app-settings';

/**
 * OpenAI bills in USD, and the amounts on these pages span six orders of
 * magnitude: one moderation scan costs a fraction of a cent, a month of them
 * costs real money. A fixed precision breaks at one end or the other — two
 * decimals prints every per-call cost as "$0.00", six makes a total unreadable
 * — so the precision follows the number.
 */
export function usd(value: number): string {
  const n = Number(value) || 0;
  if (n === 0) return '$0';
  const abs = Math.abs(n);
  if (abs < 0.01) return formatMoney(n, { symbol: '$', decimals: 6, grouping: false });
  if (abs < 1) return formatMoney(n, { symbol: '$', decimals: 4, grouping: false });
  return formatMoney(n, { symbol: '$', decimals: 2 });
}

/** Token counts are read as magnitudes, not exact figures — group them. */
export const tokens = (value: number): string => formatDateTime(Number(value || 0));
