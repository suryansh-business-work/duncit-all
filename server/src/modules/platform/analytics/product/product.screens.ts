import { AppEventModel } from '../appEvent.model';
import { AppSessionModel } from '../appSession.model';
import { applyTableQueryInMemory, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { eventMatch, sessionMatch, type ProductScope } from './product.filter';
import { byPerson, keyedRows, keyedTotals, ownersOfRows, rate, type KeyedTotals } from './product.counts';

/**
 * Analytics > Product > Screens — every screen people opened, how often, by how
 * many people, for how long, and how often it was the last one of a session.
 * The list is read from the events themselves, so a new screen appears the day
 * someone opens it.
 *
 * - Avg time is foreground time per view: the time the app reported on the
 *   screen (closed by the next screen view or by the app going to the
 *   background), divided by its views.
 * - Exit rate is the share of the screen's views that ended a session.
 * - Bounce rate is the share of sessions that began on the screen and saw
 *   nothing else.
 */

export interface ScreenRow extends Record<string, unknown> {
  screen_name: string;
  views: number;
  unique_users: number;
  avg_time_ms: number | null;
  total_time_ms: number;
  entries: number;
  exits: number;
  exit_rate: number;
  bounce_rate: number;
}

const SCREEN_TABLE: TableEntityConfig = {
  searchFields: ['screen_name'],
  sortFields: {
    screen_name: 'screen_name',
    views: 'views',
    unique_users: 'unique_users',
    avg_time_ms: 'avg_time_ms',
    total_time_ms: 'total_time_ms',
    entries: 'entries',
    exits: 'exits',
    exit_rate: 'exit_rate',
    bounce_rate: 'bounce_rate',
  },
  filterFields: {
    screen_name: { type: 'string' },
    views: { type: 'number' },
    unique_users: { type: 'number' },
    exit_rate: { type: 'number' },
  },
  defaultSort: { views: -1 },
};

/** Views and distinct people per screen. */
export async function screenViewTotals(scope: ProductScope, extra: Record<string, unknown> = {}): Promise<Map<string, KeyedTotals>> {
  const rows = await AppEventModel.aggregate<{ _id: { s: string; u: unknown; d: string }; count: number }>([
    { $match: { ...eventMatch(scope), event_name: 'screen_view', screen_name: { $ne: '' }, ...extra } },
    { $group: { _id: byPerson({ s: '$screen_name' }), count: { $sum: 1 } } },
  ]).allowDiskUse(true);
  const keyed = keyedRows(rows, (id) => id.s);
  return keyedTotals(keyed, await ownersOfRows(keyed));
}

/** Foreground time per screen: what a screen view closed for the screen before it, and a background for the one on top. */
export async function screenTime(scope: ProductScope): Promise<Map<string, number>> {
  const rows = await AppEventModel.aggregate<{ _id: string; total: number }>([
    {
      $match: {
        ...eventMatch(scope),
        event_name: { $in: ['screen_view', 'app_background'] },
        duration_ms: { $gt: 0 },
      },
    },
    {
      $group: {
        _id: { $cond: [{ $eq: ['$event_name', 'screen_view'] }, '$previous_screen', '$screen_name'] },
        total: { $sum: '$duration_ms' },
      },
    },
  ]);
  return new Map(rows.filter((row) => row._id).map((row) => [row._id, row.total]));
}

interface SessionEnds {
  entries: Map<string, number>;
  bounces: Map<string, number>;
  exits: Map<string, number>;
}

/** Per screen: sessions that began there, began and ended there with one view, and ended there. */
async function sessionEnds(scope: ProductScope): Promise<SessionEnds> {
  const [entries, exits] = await Promise.all([
    AppSessionModel.aggregate<{ _id: string; count: number; bounces: number }>([
      { $match: { ...sessionMatch(scope), entry_screen: { $ne: '' } } },
      {
        $group: {
          _id: '$entry_screen',
          count: { $sum: 1 },
          bounces: { $sum: { $cond: [{ $lte: ['$screen_views', 1] }, 1, 0] } },
        },
      },
    ]),
    AppSessionModel.aggregate<{ _id: string; count: number }>([
      { $match: { ...sessionMatch(scope), exit_screen: { $ne: '' } } },
      { $group: { _id: '$exit_screen', count: { $sum: 1 } } },
    ]),
  ]);
  return {
    entries: new Map(entries.map((row) => [row._id, row.count])),
    bounces: new Map(entries.map((row) => [row._id, row.bounces])),
    exits: new Map(exits.map((row) => [row._id, row.count])),
  };
}

/** One row per screen viewed in the period. */
export async function screenRows(scope: ProductScope): Promise<ScreenRow[]> {
  const [views, time, ends] = await Promise.all([screenViewTotals(scope), screenTime(scope), sessionEnds(scope)]);
  return [...views].map(([screen, totals]) => {
    const total = time.get(screen) ?? 0;
    const entries = ends.entries.get(screen) ?? 0;
    const exits = ends.exits.get(screen) ?? 0;
    return {
      screen_name: screen,
      views: totals.count,
      unique_users: totals.actors,
      avg_time_ms: total > 0 ? Math.round(total / totals.count) : null,
      total_time_ms: total,
      entries,
      exits,
      exit_rate: rate(exits, totals.count) ?? 0,
      bounce_rate: rate(ends.bounces.get(screen) ?? 0, entries) ?? 0,
    };
  });
}

export async function screensTable(scope: ProductScope, query: TableQueryInput | null | undefined) {
  return applyTableQueryInMemory(await screenRows(scope), query, SCREEN_TABLE);
}
