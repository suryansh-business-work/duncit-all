import { useMemo, useState } from 'react';
import { addDays, differenceInCalendarDays, startOfDay, subDays } from 'date-fns';
import { useDateFormat } from '@duncit/app-settings';

/** The window the dashboard opens on, in days including today. */
export const DEFAULT_RANGE_DAYS = 30;
/** The longest window the server answers (MAX_RANGE_DAYS in usage.service). */
export const MAX_RANGE_DAYS = 366;

export interface DayRange {
  from: Date;
  to: Date;
}

export type RangeProblem = 'order' | 'length' | null;

/** What is wrong with a picked window, if anything. */
export function rangeProblem(range: DayRange): RangeProblem {
  if (range.from > range.to) return 'order';
  if (differenceInCalendarDays(range.to, range.from) + 1 > MAX_RANGE_DAYS) return 'length';
  return null;
}

/**
 * The dashboard's date window: whole days, last 30 by default, both ends
 * inclusive — so the request runs from the start of `from` to the start of
 * the day after `to`.
 */
export function useDashboardRange() {
  const { now } = useDateFormat();
  const [range, setRange] = useState<DayRange>(() => {
    const today = startOfDay(now());
    return { from: subDays(today, DEFAULT_RANGE_DAYS - 1), to: today };
  });
  const problem = rangeProblem(range);
  const period = useMemo(
    () => ({ from: startOfDay(range.from).toISOString(), to: addDays(startOfDay(range.to), 1).toISOString() }),
    [range],
  );
  return { range, setRange, problem, period };
}
