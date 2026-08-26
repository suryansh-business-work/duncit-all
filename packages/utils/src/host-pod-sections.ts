/**
 * How Host Studio splits the pods a host runs into its three sections.
 *
 * A pod's venue-approval state — not its clock — decides which list it belongs
 * to, and one pod is only ever in ONE of them:
 *
 *  - REQUESTED  the venue has not answered yet, so the pod is offline and the
 *               host can only wait. It sits ABOVE Your Pods.
 *  - REJECTED   the venue refused the slot. It sits BELOW Your Pods, and the
 *               section is hidden entirely when nothing was refused.
 *  - YOURS      everything else — a pod nobody has to approve, or one the venue
 *               already approved, which is what "Your Pods" has always listed.
 *
 * Moving between the three is therefore just the venue's decision landing: the
 * split is recomputed from `venue_approval_status` on every read, so no surface
 * has to remember to remove a pod from one list when it adds it to another.
 *
 * mWeb and the native app both render from this (rules 27 + 40) — the logic is
 * shared, the MUI and Tamagui views are not.
 */

export type HostPodSection = 'REQUESTED' | 'YOURS' | 'REJECTED';

/** The one pod field a section is read from. */
export interface HostPodSectionFields {
  venue_approval_status?: string | null;
}

export interface HostPodSections<T> {
  requested: T[];
  yours: T[];
  rejected: T[];
}

/**
 * Which section a pod belongs to. Only the two in-flight approval states pull a
 * pod out of Your Pods; `NONE`, `APPROVED` and an unknown value all stay in it,
 * because a pod whose state cannot be read is still a pod the host runs.
 */
export function hostPodSection(status?: string | null): HostPodSection {
  if (status === 'PENDING') return 'REQUESTED';
  if (status === 'DECLINED') return 'REJECTED';
  return 'YOURS';
}

/** Buckets a host's pods in one pass — the order within each list is kept. */
export function splitHostPods<T extends HostPodSectionFields>(
  pods: readonly T[],
): HostPodSections<T> {
  const out: HostPodSections<T> = { requested: [], yours: [], rejected: [] };
  for (const pod of pods) {
    const section = hostPodSection(pod.venue_approval_status);
    if (section === 'REQUESTED') {
      out.requested.push(pod);
    } else if (section === 'REJECTED') {
      out.rejected.push(pod);
    } else {
      out.yours.push(pod);
    }
  }
  return out;
}
