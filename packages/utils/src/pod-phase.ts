/**
 * Where a pod sits in TIME — the rule behind the Home rails.
 *
 * The server states the same rule as a Mongo predicate in
 * `server/src/modules/pods/pod/pod.lifecycle.ts`; this is the CLIENT half, for
 * a feed already in memory. Both read a pod's end as `pod_end_date_time` when
 * the host set one and `start + POD_LIVE_TAIL_MS` when they did not, which is
 * why the tail is a shared constant rather than a number typed out per surface.
 *
 * A pod leaves the upcoming feed the moment it STARTS — nobody can join a pod
 * that is running, and the server refuses the booking — but it is not
 * "previous" until it is actually over. That gap is the whole reason a phase
 * splits three ways instead of the two a plain start-has-passed test gave: a
 * pod that is happening right now used to drop straight into Previous Pods.
 */
export const POD_LIVE_TAIL_MS = 4 * 60 * 60 * 1000;

export type PodPhase = 'UPCOMING' | 'ONGOING' | 'PREVIOUS';

/** The two timestamps a phase is read from, as the feed queries return them. */
export interface PodPhaseFields {
  pod_date_time?: string | null;
  pod_end_date_time?: string | null;
}

export interface PodsByPhase<T> {
  upcoming: T[];
  ongoing: T[];
  previous: T[];
}

/**
 * UPCOMING before the start, ONGOING from the start up to and including the
 * end, PREVIOUS after it.
 *
 * A missing or unparseable start is UPCOMING: the pod cannot be placed on a
 * clock, and hiding it in Previous would be the worse of the two guesses. An
 * unparseable END falls back to the tail for the same reason — it means "the
 * host set no usable end", not "this pod is over".
 */
export function podPhase(
  start?: string | null,
  end?: string | null,
  now: number = Date.now(),
): PodPhase {
  if (!start) return 'UPCOMING';
  const startMs = new Date(start).getTime();
  if (Number.isNaN(startMs)) return 'UPCOMING';
  if (now < startMs) return 'UPCOMING';
  const setEndMs = end ? new Date(end).getTime() : Number.NaN;
  const endMs = Number.isNaN(setEndMs) ? startMs + POD_LIVE_TAIL_MS : setEndMs;
  return now <= endMs ? 'ONGOING' : 'PREVIOUS';
}

/**
 * Buckets a feed in ONE pass against ONE `now`, so the three Home rails cannot
 * disagree about which one a pod belongs to — which is exactly what a second
 * `Date.now()` read a few lines later would let them do at a boundary.
 */
export function splitPodsByPhase<T extends PodPhaseFields>(
  pods: readonly T[],
  now: number = Date.now(),
): PodsByPhase<T> {
  const out: PodsByPhase<T> = { upcoming: [], ongoing: [], previous: [] };
  for (const pod of pods) {
    const phase = podPhase(pod.pod_date_time, pod.pod_end_date_time, now);
    if (phase === 'UPCOMING') {
      out.upcoming.push(pod);
    } else if (phase === 'ONGOING') {
      out.ongoing.push(pod);
    } else {
      out.previous.push(pod);
    }
  }
  return out;
}
