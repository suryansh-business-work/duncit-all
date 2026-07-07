import type { ResultOf } from '@graphql-typed-document-node/core';

import type { MyPodMembershipsDocument, PodHistoryCategoriesDocument } from '@/graphql/pod-history';
import { isPodActive } from '@/utils/pod-format';

export type PodMembership = ResultOf<typeof MyPodMembershipsDocument>['myPodMemberships'][number];
export type RefundStatus = PodMembership['refund_status'];
export type PodHistoryCategory = ResultOf<
  typeof PodHistoryCategoriesDocument
>['categories'][number];

export type PodHistorySort = 'DATE_DESC' | 'DATE_ASC' | 'PRICE_ASC' | 'PRICE_DESC';

/** [value, label] pairs for the Pod History sort sheet (single source of truth). */
export const POD_HISTORY_SORTS: readonly (readonly [PodHistorySort, string])[] = [
  ['DATE_DESC', 'Date · Newest first'],
  ['DATE_ASC', 'Date · Oldest first'],
  ['PRICE_ASC', 'Price · Low to High'],
  ['PRICE_DESC', 'Price · High to Low'],
];

export interface PodHistoryFilters {
  superId: string;
  categoryId: string;
  sort: PodHistorySort;
}

export const DEFAULT_POD_HISTORY_FILTERS: PodHistoryFilters = {
  superId: '',
  categoryId: '',
  sort: 'DATE_DESC',
};

const toMs = (iso?: string | null) => (iso ? new Date(iso).getTime() : 0);

const POD_HISTORY_COMPARATORS: Record<
  PodHistorySort,
  (a: PodMembership, b: PodMembership) => number
> = {
  DATE_DESC: (a, b) => toMs(b.pod?.pod_date_time) - toMs(a.pod?.pod_date_time),
  DATE_ASC: (a, b) => toMs(a.pod?.pod_date_time) - toMs(b.pod?.pod_date_time),
  PRICE_ASC: (a, b) => (a.pod?.pod_amount ?? 0) - (b.pod?.pod_amount ?? 0),
  PRICE_DESC: (a, b) => (b.pod?.pod_amount ?? 0) - (a.pod?.pod_amount ?? 0),
};

/** Filter the joined-pod list by Super Category → Category, then sort it. */
export function applyPodHistory(
  items: readonly PodMembership[],
  filters: PodHistoryFilters,
): PodMembership[] {
  const filtered = items.filter((item) => {
    if (filters.superId && item.pod?.club?.super_category_id !== filters.superId) return false;
    if (filters.categoryId && item.pod?.club?.category_id !== filters.categoryId) return false;
    return true;
  });
  const copy = [...filtered];
  copy.sort(POD_HISTORY_COMPARATORS[filters.sort]);
  return copy;
}

/** Top-level (For You / For Your Pet) options for the Super Category dropdown. */
export const superCategories = (cats: readonly PodHistoryCategory[]): PodHistoryCategory[] =>
  cats.filter((c) => c.level === 'SUPER');

/** Category options under a selected super (empty until a super is chosen). */
export const categoriesUnder = (
  cats: readonly PodHistoryCategory[],
  superId: string,
): PodHistoryCategory[] =>
  superId ? cats.filter((c) => c.level === 'CATEGORY' && c.parent_id === superId) : [];

export const activePodHistoryFilterCount = (filters: PodHistoryFilters): number =>
  (filters.superId ? 1 : 0) + (filters.categoryId ? 1 : 0);

/** Human labels for each refund status — mirrors mWeb's refundLabel map. */
export const REFUND_LABEL: Record<RefundStatus, string> = {
  NONE: 'Not started',
  PENDING: 'Criteria pending',
  PROCESSED: 'Refund initiated',
  NOT_ELIGIBLE: 'Not initiated',
};

/** Refund label for a status, defaulting to the NONE label for unknown values. */
export function refundLabel(status: RefundStatus): string {
  return REFUND_LABEL[status] ?? REFUND_LABEL.NONE;
}

/**
 * True when a membership qualifies for a free rejoin: the caller backed out, the
 * pod still exists (not deleted) and has not completed/ended yet. Mirrors mWeb.
 */
export function canRejoin(item: PodMembership): boolean {
  const pod = item.pod;
  return (
    item.status === 'BACKED_OUT' &&
    !pod?.is_deleted &&
    !!pod?.id &&
    isPodActive(pod?.pod_date_time, pod?.pod_end_date_time)
  );
}

/** Price caption for a pod — "Free pod" or "Paid pod ₹<amount>". */
export function podPriceCaption(podType?: string | null, amount?: number | null): string {
  return podType?.includes('FREE') ? 'Free pod' : `Paid pod ₹${amount ?? 0}`;
}

/** De-duplicate memberships by pod (keep the first per pod) — mWeb list behaviour. */
export function dedupeByPod(items: PodMembership[]): PodMembership[] {
  const byPod = new Map<string, PodMembership>();
  items.forEach((item) => {
    const key = item.pod?.id ?? item.pod_id ?? item.id;
    if (!byPod.has(key)) byPod.set(key, item);
  });
  return Array.from(byPod.values());
}

export type TimelineState = 'done' | 'current';
export type TimelineIcon = 'join' | 'backout' | 'refund' | 'wait';

export interface TimelineEvent {
  title: string;
  date?: string | null;
  detail: string;
  state: TimelineState;
  icon: TimelineIcon;
  tag: string;
}

/**
 * Build the membership timeline — RN port of mWeb's buildTimeline. Join is always
 * done; backout/refund steps depend on status + refund_status.
 */
export function buildTimeline(item: PodMembership): TimelineEvent[] {
  const backedOut = item.status === 'BACKED_OUT';
  const refundProcessed = item.refund_status === 'PROCESSED';
  const refundPending = item.refund_status === 'PENDING';

  const events: TimelineEvent[] = [
    {
      title: 'Pod Joined',
      date: item.joined_at,
      detail: 'Your spot was confirmed for this pod.',
      state: 'done',
      icon: 'join',
      tag: 'Completed',
    },
  ];

  if (!backedOut) {
    events.push({
      title: 'Backout requested',
      detail: 'No backout request yet. Use Backout Pod from actions when needed.',
      state: 'current',
      icon: 'backout',
      tag: 'Available',
    });
    return events;
  }

  events.push(
    {
      title: 'Backout requested',
      date: item.backed_out_at,
      detail: 'Backout request was recorded.',
      state: 'done',
      icon: 'backout',
      tag: 'Completed',
    },
    {
      title: 'Refund criteria',
      detail: refundPending
        ? 'Waiting for refund criteria to be completed.'
        : 'Refund criteria was checked for this backout.',
      state: refundPending ? 'current' : 'done',
      icon: 'wait',
      tag: refundPending ? 'Waiting' : 'Checked',
    },
    refundProcessed
      ? {
          title: 'Refund initiated',
          detail: 'Refund has been initiated for this membership.',
          state: 'done',
          icon: 'refund',
          tag: 'Initiated',
        }
      : {
          title: 'Refund not initiated',
          detail: 'Refund has not been initiated for this backout yet.',
          state: 'current',
          icon: 'refund',
          tag: 'Not initiated',
        },
  );
  return events;
}
