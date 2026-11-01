import { AppEventModel } from '../appEvent.model';
import { applyTableQueryInMemory, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { eventMatch, type ProductScope } from './product.filter';
import { byPerson, keyedRows, keyedTotals, ownersOfRows, rate } from './product.counts';
import { screenViewTotals } from './product.screens';

/**
 * Analytics > Product > Clickstream — every control people pressed, on which
 * screen, how often, by how many people.
 *
 * An element is named by its id (a test id, a data-testid) and, where it has
 * none, by its label — so the same "Join" on two screens is two rows.
 *
 * CTR's denominator is fixed and stated: clicks on the element ÷ views of the
 * screen it sits on, in the same period and narrowing. Clicks are every press;
 * unique users are the people who pressed at least once; repeat clicks are
 * the difference.
 */

export interface ElementRow extends Record<string, unknown> {
  key: string;
  element_id: string;
  element_name: string;
  element_type: string;
  screen_name: string;
  clicks: number;
  unique_users: number;
  repeat_clicks: number;
  screen_views: number;
  ctr: number | null;
}

/** An element's stable key: its id when it has one, else its label. */
export const elementKeyExpr = { $cond: [{ $ne: ['$element_id', ''] }, '$element_id', '$target_label'] };

const ELEMENT_TABLE: TableEntityConfig = {
  searchFields: ['element_name', 'element_id', 'screen_name'],
  sortFields: {
    element_name: 'element_name',
    screen_name: 'screen_name',
    element_type: 'element_type',
    clicks: 'clicks',
    unique_users: 'unique_users',
    repeat_clicks: 'repeat_clicks',
    screen_views: 'screen_views',
    ctr: 'ctr',
  },
  filterFields: {
    screen_name: { type: 'string' },
    element_type: { type: 'string' },
    clicks: { type: 'number' },
    unique_users: { type: 'number' },
    ctr: { type: 'number' },
  },
  defaultSort: { clicks: -1 },
};

interface ElementGroup {
  s: string;
  k: string;
  u: unknown;
  d: string;
}

const pairKey = (screen: string, key: string) => JSON.stringify([screen, key]);

/** One row per (screen, element) pressed in the period. */
export async function elementRows(scope: ProductScope, extra: Record<string, unknown> = {}): Promise<ElementRow[]> {
  const match = { ...eventMatch(scope), event_name: 'element_click', ...extra };
  const [rows, views] = await Promise.all([
    AppEventModel.aggregate<{ _id: ElementGroup; count: number; id: string; name: string; type: string }>([
      { $match: match },
      {
        $group: {
          _id: byPerson({ s: '$screen_name', k: elementKeyExpr }),
          count: { $sum: 1 },
          id: { $first: '$element_id' },
          name: { $first: '$target_label' },
          type: { $first: '$element_type' },
        },
      },
    ]).allowDiskUse(true),
    screenViewTotals(scope),
  ]);
  const keyed = keyedRows(rows, (id) => pairKey(id.s, id.k));
  const totals = keyedTotals(keyed, await ownersOfRows(keyed));
  const meta = new Map(rows.map((row) => [pairKey(row._id.s, row._id.k), row]));
  return [...totals].map(([pair, total]) => {
    const row = meta.get(pair);
    const screen = row?._id.s ?? '';
    const screenViews = views.get(screen)?.count ?? 0;
    return {
      key: row?._id.k ?? '',
      element_id: row?.id ?? '',
      element_name: row?.name || row?._id.k || '',
      element_type: row?.type ?? '',
      screen_name: screen,
      clicks: total.count,
      unique_users: total.actors,
      repeat_clicks: total.count - total.actors,
      screen_views: screenViews,
      ctr: rate(total.count, screenViews),
    };
  });
}

export async function elementsTable(scope: ProductScope, query: TableQueryInput | null | undefined) {
  return applyTableQueryInMemory(await elementRows(scope), query, ELEMENT_TABLE);
}
