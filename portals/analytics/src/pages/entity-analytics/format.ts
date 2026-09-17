import { formatMoney } from '@duncit/utils';
import type { AnalyticsFormat } from './queries';

/**
 * How an Analytics value is written, by the kind of number the server says it
 * is. Money goes compact past a lakh so a tile never wraps; a missing value
 * (a ranking row nobody rated) is an em dash rather than a misleading zero.
 */

const COUNT = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const ONE_DECIMAL = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });
const EM_DASH = '—';

export function formatValue(value: number | null | undefined, format: AnalyticsFormat): string {
  if (value === null || value === undefined) return EM_DASH;
  switch (format) {
    case 'CURRENCY':
      return formatMoney(value, { compact: true });
    case 'PERCENT':
      return `${ONE_DECIMAL.format(value)}%`;
    case 'RATING':
      return value > 0 ? value.toFixed(1) : EM_DASH;
    case 'DAYS':
    case 'DECIMAL':
      return ONE_DECIMAL.format(value);
    default:
      return COUNT.format(value);
  }
}

export type DeltaDirection = 'up' | 'down' | 'flat';

export interface Delta {
  /** Signed and formatted, e.g. "+12" — `unit` says what it counts. */
  amount: string;
  /**
   * `points` for a rate (a rate moves in points, not in percent of itself),
   * `percent` for a change relative to the previous value, `plain` when the
   * previous value was zero and a relative change would be infinite.
   */
  unit: 'points' | 'percent' | 'plain';
  good: boolean;
  direction: DeltaDirection;
}

function deltaUnit(format: AnalyticsFormat, previous: number): Delta['unit'] {
  if (format === 'PERCENT') return 'points';
  return previous === 0 ? 'plain' : 'percent';
}

/** The change from the previous period, or null when there is nothing to compare. */
export function deltaOf(
  value: number,
  previous: number | null | undefined,
  format: AnalyticsFormat,
  higherIsBetter: boolean
): Delta | null {
  if (previous === null || previous === undefined) return null;
  const diff = value - previous;
  if (Math.abs(diff) < 0.05) return { amount: '0', unit: 'plain', good: true, direction: 'flat' };
  const rising = diff > 0;
  const unit = deltaUnit(format, previous);
  const size = unit === 'percent' ? Math.abs(diff / previous) * 100 : Math.abs(diff);
  return {
    amount: `${rising ? '+' : '−'}${ONE_DECIMAL.format(size)}`,
    unit,
    good: rising === higherIsBetter,
    direction: rising ? 'up' : 'down',
  };
}
