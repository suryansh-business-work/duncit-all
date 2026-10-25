import { useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  clampSpots,
  filterProductsForClub,
  freePodVenueNotice,
  offerEarningsArgs,
  offerGuestFloor,
  pruneProductRequests,
  spotsBounds,
  type SpotsBounds,
} from '@duncit/utils';
import { filterClubs } from '../create-pod.form';
import { VENUE_AVAILABLE_SLOTS, venueSpaces } from '../steps/VenueSlotStep';
import { useOfferQuote } from '../useOfferQuote';
import { useEarningsPreview } from '../price-panel';
import type {
  CreatePodClub,
  CreatePodForm,
  CreatePodHostCategory,
  CreatePodProduct,
  CreatePodSubCategory,
  CreatePodVenue,
} from '../create-pod.types';

interface SelectionSources {
  clubs: CreatePodClub[];
  hostCategories: CreatePodHostCategory[];
  products: CreatePodProduct[];
  subCategories: CreatePodSubCategory[];
  venues: CreatePodVenue[];
  viewerUserId: string;
  /** The venue of a confirmed Pod Request — on offer whatever the club matches. */
  pinnedVenueId?: string;
}

/** A physical pod's spots snap into a range that moved (another space) —
 * anything up to the cap stays as picked. */
function useClampedSpots(form: CreatePodForm, physical: boolean, spots: SpotsBounds) {
  useEffect(() => {
    const current = Number(form.getValues('no_of_spots')) || 0;
    if (!physical || current <= 0) return;
    const next = clampSpots(current, spots);
    if (next !== current) form.setValue('no_of_spots', next, { shouldDirty: true, shouldValidate: true });
    // The bounds object is rebuilt every render; its two ends are what move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, physical, spots.min, spots.max]);
}

/**
 * What the venue costs the pod, for the Pricing panel: a held slot's price (a
 * Pod Request), else the server's quote total for the host's offer (venue
 * price + GST + Duncit's fee on top) — never a raw slot price. An offer is for
 * at least the venue's minimum guests (`offerMinGuests`; a held slot was agreed
 * already, so its own capacity is all that bounds it), and its money feeds the
 * earnings preview at both ends of the guests.
 */
function useVenueCost(form: CreatePodForm, venues: CreatePodVenue[], podMode: string) {
  const venueId = form.watch('venue_id');
  const slotId = form.watch('venue_slot_id');
  const requestId = form.watch('partner_request_id');
  const spots = Number(form.watch('no_of_spots')) || 0;
  const slotsQuery = useQuery(VENUE_AVAILABLE_SLOTS, {
    variables: { venue_id: venueId, partner_request_id: requestId || null },
    skip: podMode !== 'PHYSICAL' || !venueId || !slotId,
    fetchPolicy: 'cache-first',
  });
  const { quote, quoteMin } = useOfferQuote(form);
  const selectedVenue = venues.find((venue) => venue.id === venueId) ?? null;
  const space = venueSpaces(selectedVenue).find((item) => item.label === form.watch('venue_space_label'));
  if (slotId) {
    const selectedSlot = (slotsQuery.data?.venueAvailableSlots ?? []).find((slot) => slot.id === slotId);
    const amount = selectedSlot?.price ?? null;
    return { venueId, selectedVenue, spots, amount, bookedCapacity: selectedSlot?.capacity, offerMinGuests: 0, offerEarnings: null };
  }
  const offering = podMode === 'PHYSICAL' && !requestId;
  return {
    venueId,
    selectedVenue,
    spots,
    amount: quote?.total ?? null,
    bookedCapacity: space?.capacity,
    offerMinGuests: offering ? offerGuestFloor(selectedVenue?.offer_min_guests, space?.capacity) : 0,
    // The quote priced at the venue's minimum names its guests (`pax`).
    offerEarnings: quote ? offerEarningsArgs(quote, quoteMin, quoteMin?.pax ?? 0, spots) : null,
  };
}

/** Everything the steps derive from the live selections: the scoped clubs,
 * venues and products, the spot bounds, the Step-4 earnings preview and what a
 * free pod's host is told about the venue's charges. */
export function useStepperSelections(
  form: CreatePodForm,
  { clubs, hostCategories, products, subCategories, venues, viewerUserId, pinnedVenueId }: SelectionSources
) {
  // Clubs are scoped by the selected host category (Super + Sub), then the picked
  // city and locality (helper shared with mobile + covered by unit tests). The
  // city-wide list is what the Locality dropdown counts per area.
  const podMode = form.watch('pod_mode');
  const clubFilter = {
    hostCategories,
    selectedCategoryKey: form.watch('host_category_key'),
    locationId: form.watch('location_id'),
    podMode,
  };
  const clubsInCity = filterClubs(clubs, { ...clubFilter, locality: '' });
  const clubsForLocation = filterClubs(clubs, { ...clubFilter, locality: form.watch('locality') });

  // Step 3 venues are scoped to the selected club's auto-matched venues.
  const clubId = form.watch('club_id');
  const selectedClub = clubs.find((club) => club.id === clubId) ?? null;
  const clubVenueIds = new Set((selectedClub?.matched_venues ?? []).map((venue) => venue.id));
  // The slot path is not club-scoped on the server, so a pre-chosen venue stays offered.
  if (pinnedVenueId) clubVenueIds.add(pinnedVenueId);
  // Only offer products whose category matches the selected club (Super + Sub).
  const availableProducts = filterProductsForClub(products, selectedClub) as CreatePodProduct[];

  // Changing the club (or the host category, which clears the club) changes what
  // Step 4 may offer, so any row the new club no longer offers has to go — it
  // would otherwise render blank, price at ₹0 and die on the server's category
  // gate at publish with nothing on screen explaining why. Native twin.
  useEffect(() => {
    const requests = form.getValues('product_requests');
    const kept = pruneProductRequests(requests, availableProducts);
    if (kept !== requests) form.setValue('product_requests', kept, { shouldDirty: true });
    // availableProducts is derived from club_id, so that is the real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, form]);

  const venue = useVenueCost(form, venues, podMode);

  // How big this pod may be: floored by the sub-category's admin-set minimum
  // (a doubles game needs 4) and an offer's venue minimum, capped by the venue
  // space the host picked (a Pod Request's held slot keeps its own capacity).
  // The pod's sub-category is its club's `category_id`. Native twin (rule 27).
  const spots = spotsBounds({
    minPax: subCategories.find((sub) => sub.id === selectedClub?.category_id)?.min_pax,
    venueCapacity: podMode === 'PHYSICAL' ? venue.bookedCapacity : null,
    venueMinPax: venue.offerMinGuests,
  });
  useClampedSpots(form, podMode === 'PHYSICAL', spots);

  // Step-4 money lives here so the footer can block Create Pod on the same two
  // rules the panel renders (zero earnings / venue price not covered).
  const podType = form.watch('pod_type');
  const preview = useEarningsPreview({
    slotPrice: venue.amount,
    offerEarnings: venue.offerEarnings,
    podAmount: Number(form.watch('pod_amount')) || 0,
    noOfSpots: venue.spots,
    venueId: venue.venueId || null,
    isPhysical: podMode === 'PHYSICAL',
    isFree: podType === 'FREE',
  });

  // A free pod pays the venue nothing through Duncit, so a slot that costs
  // something is settled between the host and the venue — said on step 3 and
  // again before publishing. The rule itself is shared with native (rule 27).
  const venueNotice = freePodVenueNotice({
    podType,
    slotPrice: podMode === 'PHYSICAL' ? venue.amount : null,
    ownVenue: venue.selectedVenue?.owner_user_id === viewerUserId,
  });

  return {
    podMode,
    clubsInCity,
    clubsForLocation,
    clubVenueIds,
    availableProducts,
    spots,
    offerMinGuests: venue.offerMinGuests,
    preview,
    venueNotice,
  };
}
