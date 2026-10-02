import type { AutoPodHostProjection } from '@/hooks/useAutoPodHostProjection';

/**
 * Everything that has to hold before "Assign Myself" may go: an offer, a city
 * when the offer takes one from the host, numbers the server priced as viable
 * and in range, and — on a virtual offer — a complete meeting. Hoisted out of
 * the component so the sheet reads as one gate rather than six clauses.
 */
export function claimReady({
  autoPodId,
  needsLocation,
  projection,
  inRange,
  meetingReady,
}: Readonly<{
  autoPodId: string | null;
  needsLocation: boolean;
  projection: AutoPodHostProjection | null;
  inRange: boolean;
  meetingReady: boolean;
}>): boolean {
  if (!autoPodId || needsLocation || !meetingReady) return false;
  return !!projection && projection.viable && inRange;
}
