import type { OccasionTheme } from '@duncit/gql-types';

/** Where a look's window stands against the clock. */
export type WindowState = 'RUNNING' | 'UPCOMING' | 'ENDED' | 'UNSCHEDULED';

export const WINDOW_LABEL: Record<WindowState, string> = {
  RUNNING: 'marketing.occasions.schedule.running',
  UPCOMING: 'marketing.occasions.schedule.upcoming',
  ENDED: 'marketing.occasions.schedule.ended',
  UNSCHEDULED: 'marketing.occasions.schedule.noDates',
};

export const WINDOW_COLOR: Record<WindowState, 'success' | 'info' | 'default'> = {
  RUNNING: 'success',
  UPCOMING: 'info',
  ENDED: 'default',
  UNSCHEDULED: 'default',
};

/** Running first, then what is coming, then what has passed, then looks with no dates yet. */
const RANK: Record<WindowState, number> = { RUNNING: 0, UPCOMING: 1, ENDED: 2, UNSCHEDULED: 3 };

const ms = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const at = new Date(iso).getTime();
  return Number.isNaN(at) ? null : at;
};

export function windowState(look: Pick<OccasionTheme, 'starts_at' | 'ends_at'>, now: Date): WindowState {
  const start = ms(look.starts_at);
  const end = ms(look.ends_at);
  if (start === null || end === null) return 'UNSCHEDULED';
  if (end <= now.getTime()) return 'ENDED';
  return start <= now.getTime() ? 'RUNNING' : 'UPCOMING';
}

export interface ScheduleRow {
  look: OccasionTheme;
  state: WindowState;
}

/**
 * Every look that is not archived, in the order a planner reads a calendar:
 * what is on now and what is next by start date, then the most recently
 * ended, then the looks still waiting for dates (by name).
 */
export function scheduleRows(looks: readonly OccasionTheme[], now: Date): ScheduleRow[] {
  const rows = looks.filter((look) => !look.is_archived).map((look) => ({ look, state: windowState(look, now) }));
  rows.sort((a, b) => {
    const byState = RANK[a.state] - RANK[b.state];
    if (byState !== 0) return byState;
    if (a.state === 'UNSCHEDULED') return a.look.name.localeCompare(b.look.name);
    if (a.state === 'ENDED') return (ms(b.look.ends_at) ?? 0) - (ms(a.look.ends_at) ?? 0);
    return (ms(a.look.starts_at) ?? 0) - (ms(b.look.starts_at) ?? 0);
  });
  return rows;
}
