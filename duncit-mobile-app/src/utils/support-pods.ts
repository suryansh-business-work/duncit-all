import type { ResultOf } from '@graphql-typed-document-node/core';

import type { MobileActiveSupportPodsDocument } from '@/graphql/bouncer';

type Membership = ResultOf<typeof MobileActiveSupportPodsDocument>['myPodMemberships'][number];

export interface SupportPodOption {
  membershipId: string;
  podDocId: string;
  podSlug: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
}

const DEFAULT_DURATION_MS = 4 * 60 * 60 * 1000;

/**
 * Every pod the user has joined, ordered so the most relevant for live support
 * comes first: still-active or upcoming pods (soonest first), then ended pods
 * (most recently ended first). Pure so it's unit-testable. Kept in sync with
 * mWeb's usePodPicker ordering.
 */
export function filterSupportPods(memberships: Membership[], now = Date.now()): SupportPodOption[] {
  return memberships
    .filter((m) => !!m.pod)
    .map((m) => {
      const pod = m.pod!;
      const start = new Date(pod.pod_date_time).getTime();
      const end = pod.pod_end_date_time
        ? new Date(pod.pod_end_date_time).getTime()
        : start + DEFAULT_DURATION_MS;
      return { membershipId: m.id, pod, start, end };
    })
    .sort((a, b) => {
      const aEnded = now > a.end;
      const bEnded = now > b.end;
      if (aEnded !== bEnded) return aEnded ? 1 : -1;
      return aEnded ? b.end - a.end : a.start - b.start;
    })
    .map(({ membershipId, pod, start, end }) => ({
      membershipId,
      podDocId: pod.id,
      podSlug: pod.pod_id,
      title: pod.pod_title,
      startsAt: new Date(start).toISOString(),
      endsAt: pod.pod_end_date_time ? new Date(end).toISOString() : null,
    }));
}
