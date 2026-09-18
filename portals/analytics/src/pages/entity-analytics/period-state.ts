import type { AnalyticsCompare, QueryEntityAnalyticsArgs } from '@duncit/gql-types';
import { DEFAULT_PERIOD } from './queries';

/**
 * What a dashboard is reporting on: a preset length ending now, or a calendar
 * range; what its tiles are compared with; and — on the pages that can be
 * narrowed — one city.
 */
export interface PeriodState {
  days: number;
  /** `yyyy-MM-dd`, inclusive. Set, it wins over `days`. */
  range: { from: string; to: string } | null;
  compare: AnalyticsCompare;
  city: string | null;
}

export const initialPeriod = (): PeriodState => ({ days: DEFAULT_PERIOD, range: null, compare: 'PREVIOUS', city: null });

/** The state as the `entityAnalytics` query's arguments. */
export function periodVariables(state: PeriodState): Omit<QueryEntityAnalyticsArgs, 'entity'> {
  const shared = { compare: state.compare, city: state.city };
  return state.range ? { ...shared, from: state.range.from, to: state.range.to } : { ...shared, days: state.days };
}
