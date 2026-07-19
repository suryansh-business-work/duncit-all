import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HOST_PODS_FILTERS,
  activeHostFilterCount,
  filterHostPods,
  type FilterablePod,
  type HostPodsFilters,
} from '../hostPodsFilters';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

const upcoming: FilterablePod = {
  pod_mode: 'PHYSICAL',
  pod_type: 'NATIVE_PAID',
  pod_date_time: iso(DAY),
  pod_end_date_time: iso(DAY + HOUR),
};
const live: FilterablePod = {
  pod_mode: 'VIRTUAL',
  pod_type: 'NATIVE_FREE',
  pod_date_time: iso(-HOUR),
  pod_end_date_time: iso(HOUR),
};
const ended: FilterablePod = {
  pod_mode: 'PHYSICAL',
  pod_type: 'NON_NATIVE_PAID',
  pod_date_time: iso(-10 * HOUR),
  pod_end_date_time: null,
};
const undated: FilterablePod = {
  pod_mode: 'VIRTUAL',
  pod_type: 'NATIVE_FREE',
  pod_date_time: null,
  pod_end_date_time: null,
};
const all = [upcoming, live, ended, undated];

const withFilters = (over: Partial<HostPodsFilters>): HostPodsFilters => ({
  ...DEFAULT_HOST_PODS_FILTERS,
  ...over,
});

describe('filterHostPods', () => {
  it('returns everything when all groups are ALL', () => {
    expect(filterHostPods(all, withFilters({ type: 'ALL', time: 'ALL', price: 'ALL' }))).toHaveLength(4);
  });

  it('filters by type (physical vs virtual)', () => {
    expect(filterHostPods(all, withFilters({ time: 'ALL', type: 'VIRTUAL' }))).toEqual([live, undated]);
    expect(filterHostPods(all, withFilters({ time: 'ALL', type: 'PHYSICAL' }))).toEqual([upcoming, ended]);
  });

  it('filters by time (upcoming / ongoing / past)', () => {
    expect(filterHostPods(all, withFilters({ time: 'UPCOMING' }))).toEqual([upcoming, undated]);
    expect(filterHostPods(all, withFilters({ time: 'ONGOING' }))).toEqual([live]);
    expect(filterHostPods(all, withFilters({ time: 'PAST' }))).toEqual([ended]);
  });

  it('filters by price (paid vs free)', () => {
    expect(filterHostPods(all, withFilters({ time: 'ALL', price: 'FREE' }))).toEqual([live, undated]);
    expect(filterHostPods(all, withFilters({ time: 'ALL', price: 'PAID' }))).toEqual([upcoming, ended]);
  });

  it('combines groups with AND', () => {
    expect(
      filterHostPods(all, withFilters({ time: 'ONGOING', type: 'VIRTUAL', price: 'FREE' })),
    ).toEqual([live]);
  });
});

describe('activeHostFilterCount', () => {
  it('counts groups set away from the default', () => {
    expect(activeHostFilterCount(DEFAULT_HOST_PODS_FILTERS)).toBe(0);
    expect(activeHostFilterCount(withFilters({ type: 'VIRTUAL' }))).toBe(1);
    expect(activeHostFilterCount({ type: 'VIRTUAL', time: 'PAST', price: 'FREE' })).toBe(3);
  });
});
