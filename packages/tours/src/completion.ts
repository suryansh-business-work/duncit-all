import { HOME_TOUR_ID } from './registry';
import type { TourId } from './types';

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

/** Parse stored completions. Anything unreadable is treated as "none completed"
 * — a corrupt value must not cost the user their tour, and must never throw. */
export function readCompletedTours(raw: string | null | undefined): TourId[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is TourId => typeof id === 'string');
  } catch {
    return [];
  }
}

export function serializeCompletedTours(ids: readonly TourId[]): string {
  return JSON.stringify([...new Set(ids)]);
}

export function isTourCompleted(completed: readonly TourId[], id: TourId): boolean {
  return completed.includes(id);
}

/** Completions after finishing (or skipping) a tour. Skipping counts: the
 * requirement is "shown once by default", and a user who dismissed it has been
 * shown it. Restarting is always available from the Tour Guide centre. */
export function markTourCompleted(completed: readonly TourId[], id: TourId): TourId[] {
  return isTourCompleted(completed, id) ? [...completed] : [...completed, id];
}

/**
 * Should the Home tour run itself right now? Only for a user who has just
 * signed up and has never been shown it. Manual restarts do not go through
 * this — they start the tour directly.
 */
export function shouldAutoStartHomeTour(
  completed: readonly TourId[],
  isFirstSignup: boolean,
): boolean {
  return isFirstSignup && !isTourCompleted(completed, HOME_TOUR_ID);
}
