import type { ClubPod } from '@/hooks/useDetails';

export type ClubPodPhase = 'SOON' | 'UPCOMING' | 'PREVIOUS';

// "Happening soon" = live now, or starting within this window.
const SOON_WINDOW_MS = 24 * 60 * 60 * 1000;
// When a pod has no explicit end time, treat it as live for this long after start.
const LIVE_TAIL_MS = 4 * 60 * 60 * 1000;

/** Buckets a club pod into the Pods Schedule rails: Happening Soon / Upcoming /
 * Previous. Mirrors mWeb's clubPodPhase. */
export function clubPodPhase(start?: string | null, end?: string | null): ClubPodPhase {
  if (!start) return 'UPCOMING';
  const startMs = new Date(start).getTime();
  if (Number.isNaN(startMs)) return 'UPCOMING';
  const now = Date.now();
  const endMs = end ? new Date(end).getTime() : startMs + LIVE_TAIL_MS;
  if (now > endMs) return 'PREVIOUS';
  if (now >= startMs) return 'SOON';
  return startMs - now <= SOON_WINDOW_MS ? 'SOON' : 'UPCOMING';
}

export type ClubMoment = ClubPod['pod_images_and_videos'][number];

/** Random sample of the club's pods' media — the Club Moments segment. */
export function pickPodMoments(pods: readonly ClubPod[], limit: number): ClubMoment[] {
  const all = pods.flatMap((pod) => pod.pod_images_and_videos ?? []);
  return [...all].sort(() => Math.random() - 0.5).slice(0, limit);
}
