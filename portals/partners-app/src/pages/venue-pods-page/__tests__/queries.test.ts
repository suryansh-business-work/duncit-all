import { describe, expect, it } from 'vitest';
import type { TableFilterValue } from '@duncit/table';
import { fieldsAt, operationOf, variablesOf } from '../../../__tests__/gql-contract';
import {
  applyVenuePodsQuery,
  matchesTab,
  tabCounts,
  VENUE_POD_ATTENDEE_PROFILES,
  VENUE_PODS,
  type VenuePodRow,
} from '../queries';

const makeRow = (over: Partial<VenuePodRow> = {}): VenuePodRow => ({
  id: '1',
  pod_slug: 'yoga',
  pod_title: 'Yoga',
  pod_date_time: '2026-08-10T18:00:00.000Z',
  pod_end_date_time: null,
  pod_amount: 300,
  pod_type: 'PAID',
  no_of_spots: 8,
  attendee_count: 3,
  pod_attendees: ['u1', 'u2', 'u3'],
  host_names: ['Hema Kaur'],
  venue_id: 'v1',
  venue_name: 'Hall A',
  bucket: 'UPCOMING',
  is_active: true,
  completed_at: null,
  cancelled_at: null,
  created_at: '2026-07-01T00:00:00.000Z',
  ...over,
});

const baseQuery = {
  search: '',
  filters: [] as TableFilterValue[],
  page: 1,
  pageSize: 10,
  sortBy: null,
  sortDir: 'asc' as const,
};

describe('VENUE_PODS contract', () => {
  it('is the owner-scoped venuePods query with the fields the table renders', () => {
    expect(operationOf(VENUE_PODS)).toEqual({ name: 'VenuePods', type: 'query' });
    expect(variablesOf(VENUE_PODS)).toEqual({ venue_id: 'ID' });
    expect(fieldsAt(VENUE_PODS, 'venuePods')).toEqual(
      expect.arrayContaining([
        'id',
        'pod_title',
        'pod_date_time',
        'attendee_count',
        'pod_attendees',
        'host_names',
        'venue_name',
        'bucket',
        'cancelled_at',
        'completed_at',
      ]),
    );
  });

  it('resolves attendee names through publicUsersByIds', () => {
    expect(variablesOf(VENUE_POD_ATTENDEE_PROFILES)).toEqual({ ids: '[ID!]!' });
    expect(fieldsAt(VENUE_POD_ATTENDEE_PROFILES, 'publicUsersByIds')).toEqual([
      'user_id',
      'full_name',
      'profile_photo',
    ]);
  });
});

describe('tab helpers', () => {
  const rows = [
    makeRow(),
    makeRow({ id: '2', bucket: 'ONGOING' }),
    makeRow({ id: '3', bucket: 'COMPLETED', completed_at: '2026-07-02T00:00:00.000Z' }),
    makeRow({ id: '4', bucket: 'CANCELLED', cancelled_at: '2026-07-03T00:00:00.000Z' }),
  ];

  it('counts every tab, with Upcoming covering live pods too', () => {
    expect(tabCounts(rows)).toEqual({ ALL: 4, UPCOMING: 2, CANCELLED: 1, COMPLETED: 1 });
    expect(matchesTab(rows[1], 'UPCOMING')).toBe(true);
    expect(matchesTab(rows[1], 'COMPLETED')).toBe(false);
  });

  it('applies the tab from externalFilters plus search, sort and paging', () => {
    const cancelled = applyVenuePodsQuery(rows, {
      ...baseQuery,
      filters: [{ field: 'tab', op: 'eq', value: 'CANCELLED' }],
    });
    expect(cancelled.total).toBe(1);
    expect(cancelled.rows[0].id).toBe('4');

    const searched = applyVenuePodsQuery(
      [makeRow(), makeRow({ id: '2', pod_title: 'Book Club', host_names: ['Ravi'] })],
      { ...baseQuery, search: 'ravi' },
    );
    expect(searched.total).toBe(1);
    expect(searched.rows[0].pod_title).toBe('Book Club');

    const sorted = applyVenuePodsQuery(
      [makeRow({ pod_amount: 100 }), makeRow({ id: '2', pod_amount: 900 })],
      { ...baseQuery, sortBy: 'pod_amount', sortDir: 'desc' },
    );
    expect(sorted.rows[0].pod_amount).toBe(900);

    const paged = applyVenuePodsQuery(rows, { ...baseQuery, pageSize: 3, page: 2 });
    expect(paged.rows).toHaveLength(1);
    expect(paged.total).toBe(4);
  });
});
