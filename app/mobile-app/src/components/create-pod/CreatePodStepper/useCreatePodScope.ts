import { useEffect } from 'react';
import type { CreatePodFormState } from './useCreatePodForm';

import { useVenueQuote } from '@/hooks/useVenueQuote';
import { useVenueSlots } from '@/hooks/useVenueSlots';
import {
  filterProductsForClub,
  freePodVenueNotice,
  pruneProductRequests,
  spotsBounds,
} from '@duncit/utils';
import { filterClubs, venueBookingOf } from '../create-pod.form';
import { venueSpaces } from '../steps/VenueSlotStep/venueSpaces';
import { usePodPricing } from '../price-panel';
import type { CreatePodStepperProps } from './types';

type CreatePodScopeArgs = Pick<
  CreatePodStepperProps,
  | 'clubs'
  | 'products'
  | 'subCategories'
  | 'hostCategories'
  | 'clubAdmin'
  | 'venues'
  | 'viewerUserId'
> & {
  form: CreatePodFormState['form'];
};

/** What the picked category/area/club/booking lets each step offer: the club
 * lists, the club's venues and products, the spot bounds, the pricing and what
 * a free pod's host is told about the venue's charges. */
export function useCreatePodScope({
  form,
  clubs,
  products,
  subCategories,
  hostCategories,
  clubAdmin,
  venues,
  viewerUserId,
}: CreatePodScopeArgs) {
  // Clubs are scoped by the selected host category (Super + Sub), then the picked
  // city and locality (helper shared with mWeb + covered by unit tests). The
  // city-wide list is what the Locality dropdown counts per area.
  // A pinned club is the only club, whatever area the admin picks for the pod.
  const clubFilter = {
    hostCategories,
    selectedCategoryKey: form.watch('host_category_key'),
    locationId: form.watch('location_id'),
    podMode: form.watch('pod_mode'),
  };
  const clubsInCity = clubAdmin ? clubs : filterClubs(clubs, { ...clubFilter, locality: '' });
  const clubsForLocation = clubAdmin
    ? clubs
    : filterClubs(clubs, { ...clubFilter, locality: form.watch('locality') });

  // Step 3 venues are scoped to the selected club's auto-matched venues.
  const clubId = form.watch('club_id');
  const selectedClub = clubs.find((club) => club.id === clubId) ?? null;
  const clubVenueIds = new Set((selectedClub?.matched_venues ?? []).map((venue) => venue.id));
  // Only offer products whose category matches the selected club (Super + Sub).
  const availableProducts = filterProductsForClub(products, selectedClub);

  // Changing the club (or the host category, which clears the club) changes what
  // Step 4 may offer, so any row the new club no longer offers has to go — it
  // would otherwise render blank, price at ₹0 and die on the server's category
  // gate at publish with nothing on screen explaining why. mWeb twin.
  useEffect(() => {
    const requests = form.getValues('product_requests');
    const kept = pruneProductRequests(requests, availableProducts);
    if (kept !== requests) form.setValue('product_requests', kept, { shouldDirty: true });
    // availableProducts is derived from club_id, so that is the real trigger.
  }, [clubId]); // eslint-disable-line react-hooks/exhaustive-deps

  // What the venue costs the pod feeds the Pricing panel: a held slot's price
  // (a Pod Request), else the server's quote total for the instant booking
  // (venue price + GST + Duncit's fee on top) — never a raw slot price.
  const podMode = form.watch('pod_mode');
  const venueId = form.watch('venue_id');
  const slotId = form.watch('venue_slot_id');
  const physical = podMode === 'PHYSICAL';
  const { slots } = useVenueSlots(
    physical && slotId ? venueId : '',
    form.watch('partner_request_id'),
  );
  const selectedSlot = slots.find((slot) => slot.id === slotId) ?? null;
  const values = form.watch();
  const venueQuote = useVenueQuote(
    physical ? venueId : '',
    physical && !slotId ? venueBookingOf(values) : null,
  );
  const selectedVenue = venues.find((venue) => venue.id === venueId) ?? null;
  const space = venueSpaces(selectedVenue).find((item) => item.label === values.venue_space_label);
  const venueAmount = slotId ? (selectedSlot?.price ?? null) : (venueQuote.quote?.total ?? null);
  const bookedCapacity = slotId ? selectedSlot?.capacity : space?.capacity;

  // How big this pod may be: floored by the sub-category's admin-set minimum
  // (a doubles game needs 4) and capped by the venue space the host booked. The
  // pod's sub-category is its club's `category_id`. mWeb twin (rule 27).
  const spots = spotsBounds({
    minPax: subCategories.find((sub) => sub.id === selectedClub?.category_id)?.min_pax,
    venueCapacity: physical ? bookedCapacity : null,
  });

  // Step 4's money state lives HERE because it gates the Create Pod button: a
  // ₹0 projected payout, or a pod worth less than the venue slot, blocks
  // publishing. The panel renders from the same object, so both always agree.
  const podType = form.watch('pod_type');
  const pricing = usePodPricing({
    podAmount: Number(form.watch('pod_amount_text')) || 0,
    noOfSpots: Number(form.watch('no_of_spots_text')) || 0,
    venueId: venueId || null,
    slotPrice: venueAmount,
    venueQuote:
      !slotId && venueQuote.quote
        ? { payout: venueQuote.quote.venue_payout, commissionOnTop: venueQuote.quote.platform_fee }
        : null,
    isPhysical: podMode === 'PHYSICAL',
    isFree: podType === 'FREE',
  });

  // A free pod pays the venue nothing through Duncit, so a slot that costs
  // something is settled between the host and the venue — said on step 3 and
  // again before publishing. The rule itself is shared with mWeb (rule 27).
  const venueNotice = freePodVenueNotice({
    podType,
    slotPrice: physical ? venueAmount : null,
    ownVenue: selectedVenue?.owner_user_id === viewerUserId,
  });

  return {
    venueNotice,
    clubsInCity,
    clubsForLocation,
    clubVenueIds,
    availableProducts,
    podMode,
    spots,
    pricing,
    venueQuote,
  };
}
