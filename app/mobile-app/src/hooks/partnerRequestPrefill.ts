import { format } from 'date-fns';

import { venueSpaces } from '@/components/create-pod/steps/VenueSlotStep/venueSpaces';
import type { CreatePodFormValues, CreatePodVenue } from '@/components/create-pod';
import { CreatePodPartnerRequestDocument } from '@/graphql/pod-requests';
import { graphqlRequest } from '@/services/graphql.client';

export interface PartnerRequestPrefill {
  values: Partial<CreatePodFormValues>;
  /** The request's venue — step 3 keeps it on offer whatever club is picked. */
  pinnedVenueId: string;
}

/**
 * `navigate('CreatePod', { partnerRequestId })` — a Pod Request whose slot is
 * confirmed, laid over a fresh form exactly as step 3's own pickers would set
 * it (venue → its space → the slot window, in the admin's date-time pattern),
 * plus the request id the pod is published against. Anything else (not
 * confirmed, not the host, venue gone) leaves the form as it was: null.
 * mWeb twin: create-pod-page/usePartnerRequestPrefill.
 */
export async function loadPartnerRequestPrefill(
  requestId: string,
  venues: readonly CreatePodVenue[],
  dateTimeInputFormat: string,
): Promise<PartnerRequestPrefill | null> {
  const res = await graphqlRequest(
    CreatePodPartnerRequestDocument,
    { id: requestId },
    { auth: true },
  );
  const request = res.podPartnerRequest;
  const venue = venues.find((row) => row.id === request.venue?.id) ?? null;
  const slot = request.slot;
  const usable = request.status === 'SLOT_CONFIRMED' && request.viewer_side === 'HOST';
  if (!usable || !venue || !slot) return null;

  const values: Partial<CreatePodFormValues> = {
    venue_id: venue.id,
    venue_slot_id: slot.id,
    pod_date_time_text: format(new Date(slot.start_at), dateTimeInputFormat),
    pod_end_date_time_text: format(new Date(slot.end_at), dateTimeInputFormat),
    partner_request_id: request.id,
  };
  if (venue.location_id) values.location_id = venue.location_id;
  const space = venueSpaces(venue).find((row) => row.slotSpaceLabel === slot.space_label);
  if (space) {
    values.venue_space_label = space.label;
    values.no_of_spots_text = String(space.capacity);
  }
  return { values, pinnedVenueId: venue.id };
}
