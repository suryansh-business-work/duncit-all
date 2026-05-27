import { subDays, startOfMonth, startOfWeek, startOfYear } from 'date-fns';

export type DashboardRange = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

export interface DateWindow {
  from?: Date;
  to?: Date;
}

export const RANGE_LABELS: Record<DashboardRange, string> = {
  today: 'Today',
  week: 'This week',
  month: 'This month',
  year: 'This year',
  all: 'All time',
  custom: 'Custom',
};

export function rangeToWindow(range: DashboardRange, custom: DateWindow): DateWindow {
  const now = new Date();
  switch (range) {
    case 'today':
      return { from: subDays(now, 1), to: now };
    case 'week':
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: now };
    case 'month':
      return { from: startOfMonth(now), to: now };
    case 'year':
      return { from: startOfYear(now), to: now };
    case 'all':
      return {};
    case 'custom':
      return { from: custom.from, to: custom.to };
    default:
      return {};
  }
}

export function isInWindow(timestamp: string | null | undefined, window: DateWindow): boolean {
  if (!timestamp) return false;
  const t = new Date(timestamp).getTime();
  if (Number.isNaN(t)) return false;
  if (window.from && t < window.from.getTime()) return false;
  if (window.to && t > window.to.getTime()) return false;
  return true;
}

export interface StageCount {
  stage: string;
  venue: number;
  host: number;
  total: number;
}

export interface ServiceCount {
  label: string;
  count: number;
}

export interface SuperCategoryCount {
  super_category_id: string;
  label: string;
  venue: number;
  host: number;
  total: number;
}
