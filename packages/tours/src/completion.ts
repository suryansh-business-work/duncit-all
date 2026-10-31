import { HOME_TOUR_ID } from './registry';

/**
 * Storage key for one user's completed tours.
 *
 * Keyed by user id on purpose. Every other persisted flag in these apps is
 * device-scoped with no user id, which means a second person signing in on the
 * same phone or browser inherits the first person's state. For a "show this
 * once" flag that is the difference between a new user getting their tour and
 * silently never seeing it.
 */
export function tourStorageKey(userId: string): string {
  return `duncit.tours.completed.${userId}`;
}

/**
 * Parse stored completions. Anything unreadable is treated as "none completed"
 * — a corrupt value must not cost the user their tour, and must never throw.
 *
 * The id type is open: mWeb and native store the registry's closed `TourId`,
 * while a portal page's first-run tour (`useFirstRunTour` in `@duncit/ui`)
 * stores its own string id in the same shape. A caller whose list is typed
 * `TourId[]` keeps that type — the parameter is inferred from the context.
 */
export function readCompletedTours<Id extends string = string>(raw: string | null | undefined): Id[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is Id => typeof id === 'string');
  } catch {
    return [];
  }
}

export function serializeCompletedTours(ids: readonly string[]): string {
  return JSON.stringify([...new Set(ids)]);
}

export function isTourCompleted(completed: readonly string[], id: string): boolean {
  return completed.includes(id);
}

/** Completions after finishing (or skipping) a tour. Skipping counts: the
 * requirement is "shown once by default", and a user who dismissed it has been
 * shown it. Restarting is always available from the Tour Guide centre. */
export function markTourCompleted<Id extends string>(completed: readonly Id[], id: Id): Id[] {
  return isTourCompleted(completed, id) ? [...completed] : [...completed, id];
}

/**
 * Should the Home tour run itself right now? Only for a user who has just
 * signed up and has never been shown it. Manual restarts do not go through
 * this — they start the tour directly.
 */
export function shouldAutoStartHomeTour(
  completed: readonly string[],
  isFirstSignup: boolean,
): boolean {
  return isFirstSignup && !isTourCompleted(completed, HOME_TOUR_ID);
}
