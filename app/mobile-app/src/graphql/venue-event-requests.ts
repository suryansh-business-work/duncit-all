import { gql } from '@/generated/graphql';

/**
 * Workshop & Event Requests, for a venue owner on their phone: what members
 * asked the owner's venues for, answered with Accept / Reject / Counter offer,
 * plus the read-only history of slot requests from before instant booking.
 */
export const VenueEventRequestsDocument = gql(`
  query MobileVenueEventRequests($query: TableQueryInput) {
    myReceivedEventRequestsTable(target_type: VENUE, query: $query) {
      rows {
        id
        target_id
        target_name
        requester_name
        note
        status
        created_at
        response_note
        offer {
          start_at
          end_at
          pax
          quote {
            venue_payout
          }
        }
      }
      total
    }
  }
`);

/** COUNTER needs an offer; the server prices a venue's offer itself and freezes it. */
export const RespondToEventRequestDocument = gql(`
  mutation MobileRespondToEventRequest(
    $id: ID!
    $response: EventRequestResponse!
    $note: String
    $offer: EventRequestOfferInput
  ) {
    respondToEventRequest(id: $id, response: $response, note: $note, offer: $offer) {
      id
      status
    }
  }
`);

/** Old slot requests — kept read-only; nothing new creates them. */
export const VenueSlotRequestHistoryDocument = gql(`
  query MobileVenueSlotRequestHistory($limit: Int) {
    myVenueSlotRequestHistory(limit: $limit) {
      slot_id
      venue_name
      pod_title
      start_at
      end_at
      status
      decision
      decided_at
      decline_reason
    }
  }
`);
