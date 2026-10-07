import { gql, type TypedDocumentNode } from '@apollo/client';
import type { CreatePodSlot } from './create-pod.types';

/** A venue's open slots. `partner_request_id` (that Pod Request's host only)
 * also returns the slot the request holds, so step 3 can show it as picked. */
export const VENUE_AVAILABLE_SLOTS: TypedDocumentNode<
  { venueAvailableSlots: CreatePodSlot[] },
  { venue_id: string; partner_request_id?: string | null }
> = gql`
  query CreatePodVenueSlots($venue_id: ID!, $partner_request_id: ID) {
    venueAvailableSlots(venue_id: $venue_id, partner_request_id: $partner_request_id) {
      id
      start_at
      end_at
      whole_day
      price
      space_label
      capacity
      status
    }
  }
`;
