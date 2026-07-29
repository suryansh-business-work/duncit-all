import { findTour, type TourStep } from '@duncit/tours';

/**
 * The steps of a tour that can actually be shown right now — those whose anchor
 * is mounted, in registry order.
 *
 * The provider and every anchor MUST agree on this list, because spotlight-tour
 * identifies a target by its index within it. Deriving both from one function is
 * what keeps a step pointing at the element its copy describes.
 */
export function visibleTourSteps(
  tourId: string | null,
  mountedAnchors: readonly string[],
): TourStep[] {
  const tour = tourId ? findTour(tourId) : undefined;
  if (!tour) return [];
  return tour.steps.filter((step) => mountedAnchors.includes(step.anchor));
}

/** Where an anchor sits in the visible list, or -1 when it is not shown. */
export function visibleStepIndex(
  tourId: string | null,
  mountedAnchors: readonly string[],
  anchor: string,
): number {
  return visibleTourSteps(tourId, mountedAnchors).findIndex((step) => step.anchor === anchor);
}
