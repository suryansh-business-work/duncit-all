import type { ResultOf } from '@graphql-typed-document-node/core';
import {
  isPodPast,
  participationInputFrom,
  podParticipationActions,
  type PodRefundStatus,
} from '@duncit/utils';

import type { MyPodMembershipsDocument, PodHistoryCategoriesDocument } from '@/graphql/pod-history';
import { fallbackT, type Translate } from '@/i18n/fallback';
import { makeCategoryMatcher } from '@/utils/category-match';

export type PodMembership = ResultOf<typeof MyPodMembershipsDocument>['myPodMemberships'][number];
export type RefundStatus = PodMembership['refund_status'];
export type PodHistoryCategory = ResultOf<
  typeof PodHistoryCategoriesDocument
>['categories'][number];

export type PodHistorySort = 'DATE_DESC' | 'DATE_ASC' | 'PRICE_ASC' | 'PRICE_DESC';

/** [value, translation key] pairs for the Pod History sort sheet (single source
 * of truth). The words live in @duncit/i18n so mWeb's menu reads identically. */
const POD_HISTORY_SORT_KEYS: readonly (readonly [PodHistorySort, string])[] = [
  ['DATE_DESC', 'mweb.podHistory.sortDateNewest'],
  ['DATE_ASC', 'mweb.podHistory.sortDateOldest'],
  ['PRICE_ASC', 'mweb.podHistory.sortPriceLowHigh'],
  ['PRICE_DESC', 'mweb.podHistory.sortPriceHighLow'],
];

/** [value, label] pairs for the sort sheet, in the reader's language. */
export const podHistorySorts = (
  t: Translate = fallbackT,
): readonly (readonly [PodHistorySort, string])[] =>
  POD_HISTORY_SORT_KEYS.map(([value, key]) => [value, t(key)] as const);

export interface PodHistoryFilters {
  /** Free-text query typed in the Pod History search box. */
  search: string;
  superId: string;
  categoryId: string;
  sort: PodHistorySort;
}

export const DEFAULT_POD_HISTORY_FILTERS: PodHistoryFilters = {
  search: '',
  superId: '',
  categoryId: '',
  sort: 'DATE_DESC',
};

/**
 * Case-insensitive match over the fields a joined pod is recognised by: its
 * title, its pod id and the club slug it belongs to. An empty term matches
 * everything. The list is already in memory (myPodMemberships returns the whole
 * history), so this filters client-side — no query round-trip per keystroke.
 * Mirrors mWeb's matchesPodHistorySearch.
 */
export function matchesPodHistorySearch(item: PodMembership, term: string): boolean {
  const query = term.trim().toLowerCase();
  if (!query) return true;
  const pod = item.pod;
  return [pod?.pod_title, pod?.pod_id, pod?.club_slug].some(
    (field) => !!field?.toLowerCase().includes(query),
  );
}

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

/**
 * Filter the joined-pod list by search text and Super Category → Category, then
 * sort it.
 *
 * A club is tagged at its leaf category (typically the SUB level), so a naive
 * `club.category_id === filters.categoryId` matched nothing. We instead match on
 * the whole root-to-leaf path via {@link makeCategoryMatcher}: a Category filter
 * keeps clubs tagged at that category OR any of its SUB descendants (mirrors the
 * Clubs filter). The deepest selected level (category over super) wins.
 */
export function applyPodHistory(
  items: readonly PodMembership[],
  filters: PodHistoryFilters,
  categories: readonly PodHistoryCategory[] = [],
): PodMembership[] {
  const matches = makeCategoryMatcher(categories);
  const target = filters.categoryId || filters.superId;
  const filtered = items.filter(
    (item) => matches(item.pod?.club, target) && matchesPodHistorySearch(item, filters.search),
  );
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

/** Translation KEYS for each refund status — mirrors mWeb's map. The words live
 * in @duncit/i18n so the two apps cannot describe one refund differently. */
export const REFUND_LABEL: Record<PodRefundStatus, string> = {
  NONE: 'mweb.podHistory.refundNotStarted',
  PENDING: 'mweb.podHistory.refundPending',
  PROCESSED: 'mweb.podHistory.refundProcessed',
  NOT_ELIGIBLE: 'mweb.podHistory.refundNotEligible',
};

/** Refund label for a status, defaulting to the NONE label for unknown values. */
export function refundLabel(status: PodRefundStatus, t: Translate = fallbackT): string {
  return t(REFUND_LABEL[status] ?? REFUND_LABEL.NONE);
}

/**
 * True when a membership qualifies for a free rejoin: the caller backed out, the
 * pod still exists (not deleted) and has not STARTED yet. Mirrors mWeb.
 *
 * The pod's start rather than its end, because that is where the server closes
 * rejoin — an end-time window kept offering a button whose every press failed.
 */
export function canRejoin(item: PodMembership): boolean {
  const pod = item.pod;
  return (
    item.status === 'BACKED_OUT' && !pod?.is_deleted && !!pod?.id && !isPodPast(pod?.pod_date_time)
  );
}

/** Price caption for a pod — "Free pod" or "Paid pod ₹<amount>". */
export function podPriceCaption(
  podType?: string | null,
  amount?: number | null,
  t: Translate = fallbackT,
): string {
  if (podType === 'FREE') return t('mweb.podHistory.freePod');
  return t('mweb.podHistory.paidPod', { vars: { amount: `₹${amount ?? 0}` } });
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

/**
 * What this booking may still be offered, and what it may claim about itself.
 *
 * The rules live in @duncit/utils so this screen and mWeb's cannot drift: a pod
 * that has already happened has nothing left to back out of, a booking nobody
 * asked a refund for has no refund state to report, and after the date the word
 * is Visited rather than Joined.
 */
export function podHistoryGate(item: PodMembership) {
  return podParticipationActions(
    participationInputFrom(item.participation, item.pod?.pod_date_time),
  );
}
