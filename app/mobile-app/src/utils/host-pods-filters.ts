import { podStatus } from './pod-format';

export type HostTypeFilter = 'ALL' | 'PHYSICAL' | 'VIRTUAL';
export type HostTimeFilter = 'ALL' | 'UPCOMING' | 'ONGOING' | 'PAST';
export type HostPriceFilter = 'ALL' | 'PAID' | 'FREE';

export interface HostPodsFilters {
  type: HostTypeFilter;
  time: HostTimeFilter;
  price: HostPriceFilter;
}

/** The pod fields the Your-Pods filter reads. */
export interface FilterablePod {
  pod_mode?: string | null;
  pod_type: string;
  pod_date_time?: string | null;
  pod_end_date_time?: string | null;
}

/** Default view = every hosted pod: no type, time or price narrowed. Mirrors mWeb. */
export const DEFAULT_HOST_PODS_FILTERS: HostPodsFilters = {
  type: 'ALL',
  time: 'ALL',
  price: 'ALL',
};

export const HOST_TYPE_OPTIONS: readonly (readonly [HostTypeFilter, string])[] = [
  ['ALL', 'All'],
  ['PHYSICAL', 'Physical'],
  ['VIRTUAL', 'Virtual'],
];

export const HOST_TIME_OPTIONS: readonly (readonly [HostTimeFilter, string])[] = [
  ['ALL', 'All'],
  ['UPCOMING', 'Upcoming'],
  ['ONGOING', 'Ongoing'],
  ['PAST', 'Past'],
];

export const HOST_PRICE_OPTIONS: readonly (readonly [HostPriceFilter, string])[] = [
  ['ALL', 'All'],
  ['PAID', 'Paid'],
  ['FREE', 'Free'],
];

function typeMatches(pod: FilterablePod, type: HostTypeFilter): boolean {
  if (type === 'ALL') return true;
  const isVirtual = pod.pod_mode === 'VIRTUAL';
  return type === 'VIRTUAL' ? isVirtual : !isVirtual;
}

function timeMatches(pod: FilterablePod, time: HostTimeFilter): boolean {
  if (time === 'ALL') return true;
  const status = podStatus(pod.pod_date_time, pod.pod_end_date_time);
  if (time === 'UPCOMING') return status === 'UPCOMING';
  if (time === 'ONGOING') return status === 'LIVE';
  return status === 'ENDED';
}

function priceMatches(pod: FilterablePod, price: HostPriceFilter): boolean {
  if (price === 'ALL') return true;
  const isFree = pod.pod_type === 'FREE';
  return price === 'FREE' ? isFree : !isFree;
}

/** Filters hosted pods by Type + Time + Price (AND across the three groups). */
export function filterHostPods<T extends FilterablePod>(
  pods: readonly T[],
  filters: HostPodsFilters,
): T[] {
  return pods.filter(
    (pod) =>
      typeMatches(pod, filters.type) &&
      timeMatches(pod, filters.time) &&
      priceMatches(pod, filters.price),
  );
}

/** How many filter groups are set away from their default — drives the badge. */
export function activeHostFilterCount(filters: HostPodsFilters): number {
  let count = 0;
  if (filters.type !== DEFAULT_HOST_PODS_FILTERS.type) count += 1;
  if (filters.time !== DEFAULT_HOST_PODS_FILTERS.time) count += 1;
  if (filters.price !== DEFAULT_HOST_PODS_FILTERS.price) count += 1;
  return count;
}
