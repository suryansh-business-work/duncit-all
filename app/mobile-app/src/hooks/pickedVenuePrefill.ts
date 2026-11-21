import { hostCategoryKeyOf, pickedVenueSeed, type PickedVenueSeed } from '@duncit/utils';

import type { CreatePodHostCategory, CreatePodLocation, CreatePodVenue } from '@/components/create-pod';

/**
 * `navigate('CreatePod', { pickVenueId })` — "Pick This Venue for Pod" on Venue
 * Details. The venue as Create Pod offers it, or null when it does not (not
 * approved, dark) or a Pod Request's own venue wins; the form then opens as
 * usual. mWeb twin: create-pod-page/usePickedVenue.
 */
export function pickedVenueOf(
  pickVenueId: string,
  partnerRequestId: string,
  venues: readonly CreatePodVenue[],
): CreatePodVenue | null {
  if (!pickVenueId || partnerRequestId) return null;
  return venues.find((venue) => venue.id === pickVenueId) ?? null;
}

/**
 * What a NEW pod opens with for the picked venue: a physical pod there, in its
 * city and area, on Where & when when the host has one category to pick.
 */
export function pickedVenueFreshSeed(
  venue: CreatePodVenue,
  locations: readonly CreatePodLocation[],
  hostCategories: readonly CreatePodHostCategory[],
): PickedVenueSeed {
  const sole = hostCategories.length === 1 ? hostCategories[0] : undefined;
  return pickedVenueSeed(venue, locations, sole ? hostCategoryKeyOf(sole) : null);
}
