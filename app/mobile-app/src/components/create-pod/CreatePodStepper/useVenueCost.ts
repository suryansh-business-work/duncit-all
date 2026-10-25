import { offerEarningsArgs, offerGuestFloor } from '@duncit/utils';

import { useOfferQuote } from '@/hooks/useOfferQuote';
import { useVenueSlots } from '@/hooks/useVenueSlots';
import { venueOfferPriceOf } from '../create-pod.form';
import type { CreatePodForm, CreatePodVenue } from '../create-pod.types';
import { venueSpaces } from '../steps/VenueSlotStep/venueSpaces';

/**
 * What the venue costs the pod, for the Pricing panel: a held slot's price (a
 * Pod Request, or a club admin's edit), else the server's quote total for the
 * host's offer (venue price + GST + Duncit's fee on top) — never a raw slot
 * price. An offer is for at least the venue's minimum guests
 * (`offerMinGuests`; a held slot was agreed already, so its own capacity is all
 * that bounds it), and its money feeds the earnings preview at both ends of the
 * guests. The quote is asked without the points or the note, so typing those
 * never re-prices. mWeb twin: useStepperSelections' useVenueCost.
 */
export function useVenueCost(form: CreatePodForm, venues: readonly CreatePodVenue[]) {
  const values = form.watch();
  const physical = values.pod_mode === 'PHYSICAL';
  const venueId = values.venue_id;
  const slotId = values.venue_slot_id;
  const { slots } = useVenueSlots(physical && slotId ? venueId : '', values.partner_request_id);
  const venueQuote = useOfferQuote(
    physical ? venueId : '',
    physical && !slotId ? venueOfferPriceOf(values) : null,
  );
  const selectedVenue = venues.find((venue) => venue.id === venueId) ?? null;
  const space = venueSpaces(selectedVenue).find((item) => item.label === values.venue_space_label);

  if (slotId) {
    const selectedSlot = slots.find((slot) => slot.id === slotId) ?? null;
    return {
      selectedVenue,
      venueQuote,
      amount: selectedSlot?.price ?? null,
      bookedCapacity: selectedSlot?.capacity,
      offerMinGuests: 0,
      offerEarnings: null,
    };
  }
  const { quote, quoteMin } = venueQuote;
  const offering = physical && !values.partner_request_id;
  return {
    selectedVenue,
    venueQuote,
    amount: quote?.total ?? null,
    bookedCapacity: space?.capacity,
    offerMinGuests: offering
      ? offerGuestFloor(selectedVenue?.offer_min_guests, space?.capacity)
      : 0,
    // The quote priced at the venue's minimum names its guests (`pax`).
    offerEarnings: quote
      ? offerEarningsArgs(quote, quoteMin, quoteMin?.pax ?? 0, Number(values.no_of_spots_text) || 0)
      : null,
  };
}
