/**
 * A city an admin has added but not yet launched still shows in both apps'
 * location pickers. Its tile counts the people waiting for it instead of its
 * clubs, and choosing it opens the launch waitlist instead of the feed. These
 * are the rules both apps ask — mWeb and native render their own views
 * (rule 40: share the logic, never the UI).
 */

/** The launch goal a city gets when an admin sets none. */
export const DEFAULT_LAUNCH_TARGET = 2000;

/** Whole percent (0–100) of the way to the launch target; 100 once reached, 0 for a non-positive target. */
export function launchProgress(count: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((count / target) * 100)));
}

/** Whether a location-picker tile shows the city's waitlist ("N people are in") rather than its clubs. */
export function showsWaitlist(city: Readonly<{ is_launched?: boolean | null }>): boolean {
  return city.is_launched === false;
}
