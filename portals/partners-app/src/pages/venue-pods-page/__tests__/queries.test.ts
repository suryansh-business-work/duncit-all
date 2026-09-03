import { describe, expect, it } from 'vitest';
import type { TableFilterValue } from '@duncit/table';
import { fieldsAt, operationOf, variablesOf } from '../../../__tests__/gql-contract';
import {
  applyVenuePodsQuery,
  cancelDisabledText,
  cancelSuccessMessage,
  VENUE_CANCEL_PENALTY,
  VENUE_CANCEL_POD,
  VENUE_POD_ATTENDEE_PROFILES,
  VENUE_PODS,
} from '../queries';
import { makeVenuePodRow as makeRow } from './fixtures';

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

  it('cancels a pod with a pod id and a reason, and reads back the health outcome', () => {
    expect(operationOf(VENUE_CANCEL_POD)).toEqual({ name: 'VenueCancelPod', type: 'mutation' });
    expect(variablesOf(VENUE_CANCEL_POD)).toEqual({ pod_id: 'ID!', reason: 'String!' });
    expect(fieldsAt(VENUE_CANCEL_POD, 'venueCancelPod')).toEqual([
      'pod_id',
      'health_penalty',
      'venue_health_score',
      'refunded_count',
    ]);
  });

  it('reads the live penalty under its own operation name, never PublicAppSettings', () => {
    expect(operationOf(VENUE_CANCEL_PENALTY)).toEqual({
      name: 'VenueCancelPenalty',
      type: 'query',
    });
    expect(variablesOf(VENUE_CANCEL_PENALTY)).toEqual({});
    expect(fieldsAt(VENUE_CANCEL_PENALTY, 'publicAppSettings')).toEqual([
      'venue_cancel_health_penalty',
    ]);
  });
});

describe('cancelDisabledText', () => {
  // The rule itself (which pods may be cancelled) is tested in @duncit/utils;
  // this pins the owner's words for each answer it gives.
  it('explains every disabled state and stays silent when the action is live', () => {
    expect(cancelDisabledText(makeRow({ bucket: 'UPCOMING' }))).toBeNull();
    expect(cancelDisabledText(makeRow({ bucket: 'CANCELLED' }))).toBe(
      'This pod is already cancelled.',
    );
    expect(cancelDisabledText(makeRow({ bucket: 'ONGOING' }))).toBe(
      'This pod has already started, so it can no longer be cancelled.',
    );
    expect(cancelDisabledText(makeRow({ bucket: 'COMPLETED' }))).toBe(
      'This pod has already finished.',
    );
  });
});

describe('cancelSuccessMessage', () => {
  const result = { pod_id: '1', health_penalty: 7, venue_health_score: 82, refunded_count: 3 };

  it('reports the refunds and the resulting health score from the server', () => {
    expect(cancelSuccessMessage(result)).toBe(
      "Pod cancelled — 3 payments refunded. This venue's Account Health is now 82.",
    );
  });

  it('says "1 payment" for a single refund and still reports zero refunds', () => {
    expect(cancelSuccessMessage({ ...result, refunded_count: 1 })).toContain('1 payment refunded');
    expect(cancelSuccessMessage({ ...result, refunded_count: 0 })).toContain('0 payments refunded');
  });
});

describe('applyVenuePodsQuery', () => {
  const rows = [
    makeRow(),
    makeRow({ id: '2', bucket: 'ONGOING' }),
    makeRow({ id: '3', bucket: 'COMPLETED', completed_at: '2026-07-02T00:00:00.000Z' }),
    makeRow({ id: '4', bucket: 'CANCELLED', cancelled_at: '2026-07-03T00:00:00.000Z' }),
  ];

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
