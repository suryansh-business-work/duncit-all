import type { ResultOf } from '@graphql-typed-document-node/core';

import type { MyPodMembershipsDocument } from '@/graphql/pod-history';

export type PodMembership = ResultOf<typeof MyPodMembershipsDocument>['myPodMemberships'][number];
export type RefundStatus = PodMembership['refund_status'];

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

  events.push({
    title: 'Backout requested',
    date: item.backed_out_at,
    detail: 'Backout request was recorded.',
    state: 'done',
    icon: 'backout',
    tag: 'Completed',
  });
  events.push({
    title: 'Refund criteria',
    detail: refundPending
      ? 'Waiting for refund criteria to be completed.'
      : 'Refund criteria was checked for this backout.',
    state: refundPending ? 'current' : 'done',
    icon: 'wait',
    tag: refundPending ? 'Waiting' : 'Checked',
  });
  events.push(
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
