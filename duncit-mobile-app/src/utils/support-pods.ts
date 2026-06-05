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

const UPCOMING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const GRACE_AFTER_END_MS = 6 * 60 * 60 * 1000;
const DEFAULT_DURATION_MS = 4 * 60 * 60 * 1000;

/**
 * Joined pods that are upcoming (within 7 days) or still in the 6h grace window
 * after ending — i.e. where live support tools are relevant. RN port of mWeb's
 * usePodPicker filter; pure so it's unit-testable.
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
    .filter(({ start, end }) =>
      now < start ? start - now <= UPCOMING_WINDOW_MS : now <= end + GRACE_AFTER_END_MS,
    )
    .sort((a, b) => a.start - b.start)
    .map(({ membershipId, pod, start, end }) => ({
      membershipId,
      podDocId: pod.id,
      podSlug: pod.pod_id,
      title: pod.pod_title,
      startsAt: new Date(start).toISOString(),
      endsAt: pod.pod_end_date_time ? new Date(end).toISOString() : null,
    }));
}
