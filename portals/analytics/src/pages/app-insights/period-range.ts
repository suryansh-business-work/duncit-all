import { format, subDays } from 'date-fns';
import type { PeriodState } from '../entity-analytics/period-state';

const DAY = 'yyyy-MM-dd';

/** The dashboard's period as the yyyy-MM-dd days the data tables read: the custom range, or the last N days. */
export function periodRange(period: PeriodState, today = new Date()): { from: string; to: string } {
  if (period.range) return period.range;
  return { from: format(subDays(today, period.days), DAY), to: format(today, DAY) };
}
