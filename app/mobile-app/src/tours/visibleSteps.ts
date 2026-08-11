import { findTour, type TourStep } from '@duncit/tours';

/**
 * How long to wait after the first anchors appear before locking the step list.
 *
 * A screen does not arrive at once: the header is up immediately, the feed lands
 * when its query resolves, a rail below it later still. Locking on the first
 * anchor meant locking on the header alone — the Home tour has seven steps and
 * ran two of them. Every further anchor restarts this wait, so the list is only
 * frozen once the screen has stopped growing.
 */
export const TOUR_SETTLE_MS = 1200;

/**
 * The steps of a tour whose anchor is currently on screen, in registry order.
 *
 * A step whose element is absent is dropped: there is nothing to spotlight, and
 * a screen legitimately varies (no clubs yet → no clubs section). Dropping keeps
 * the rest of the walkthrough usable, which is what mWeb does with a selector
 * that matches nothing.
 */
export function visibleTourSteps(
  tourId: string | null,
  mountedAnchors: readonly string[],
): TourStep[] {
  const tour = tourId ? findTour(tourId) : undefined;
  if (!tour) return [];
  return tour.steps.filter((step) => mountedAnchors.includes(step.anchor));
}

/** How many steps the tour has in total, or 0 for an id no longer in the registry. */
export function tourStepCount(tourId: string | null): number {
  return tourId ? (findTour(tourId)?.steps.length ?? 0) : 0;
}
