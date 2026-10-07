import { useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { filterProductsForClub, pruneProductRequests, spotsBounds } from '@duncit/utils';
import { filterClubs } from '../create-pod.form';
import { VENUE_AVAILABLE_SLOTS } from '../steps/VenueSlotStep';
import { useEarningsPreview } from '../price-panel';
import type {
  CreatePodClub,
  CreatePodForm,
  CreatePodHostCategory,
  CreatePodProduct,
  CreatePodSubCategory,
} from '../create-pod.types';

interface SelectionSources {
  clubs: CreatePodClub[];
  hostCategories: CreatePodHostCategory[];
  products: CreatePodProduct[];
  subCategories: CreatePodSubCategory[];
  /** The venue of a confirmed Pod Request — on offer whatever the club matches. */
  pinnedVenueId?: string;
}

/** Everything the steps derive from the live selections: the scoped clubs,
 * venues and products, the spot bounds and the Step-4 earnings preview. */
export function useStepperSelections(
  form: CreatePodForm,
  { clubs, hostCategories, products, subCategories, pinnedVenueId }: SelectionSources
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

  // The picked slot feeds the Pricing panel (slot price + GST + earnings).
  const venueId = form.watch('venue_id');
  const slotId = form.watch('venue_slot_id');
  const slotsQuery = useQuery(VENUE_AVAILABLE_SLOTS, {
    variables: { venue_id: venueId, partner_request_id: form.watch('partner_request_id') || null },
    skip: podMode !== 'PHYSICAL' || !venueId,
    fetchPolicy: 'cache-first',
  });
  const selectedSlot = (slotsQuery.data?.venueAvailableSlots ?? []).find((slot) => slot.id === slotId) ?? null;

  // How big this pod may be: floored by the sub-category's admin-set minimum
  // (a doubles game needs 4) and capped by the venue space the host booked. The
  // pod's sub-category is its club's `category_id`. Native twin (rule 27).
  const spots = spotsBounds({
    minPax: subCategories.find((sub) => sub.id === selectedClub?.category_id)?.min_pax,
    venueCapacity: podMode === 'PHYSICAL' ? selectedSlot?.capacity : null,
  });

  // Step-4 money lives here so the footer can block Create Pod on the same two
  // rules the panel renders (zero earnings / venue price not covered).
  const preview = useEarningsPreview({
    slotPrice: selectedSlot ? selectedSlot.price : null,
    podAmount: Number(form.watch('pod_amount')) || 0,
    noOfSpots: Number(form.watch('no_of_spots')) || 0,
    venueId: venueId || null,
    isPhysical: podMode === 'PHYSICAL',
    isFree: form.watch('pod_type') === 'FREE',
  });

  return { podMode, clubsInCity, clubsForLocation, clubVenueIds, availableProducts, spots, preview };
}
