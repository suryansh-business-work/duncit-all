import { gql } from '@apollo/client';
import type { EventRequestStatus } from '@duncit/gql-types';
import { BREAKDOWN_FIELDS } from '../pricing/queries';
import type { PriceBreakdown } from '../pricing/types';

export type { EventRequestStatus };

/** The window an owner offered, with the price frozen when they offered it. */
export interface EventRequestOfferView {
  start_at: string;
  end_at: string;
  pax: number;
  /** Only the two figures a request row shows. */
  quote: Pick<PriceBreakdown, 'total' | 'venue_payout'> | null;
}

/** What the respond actions and the request cards read from one request. */
export interface VenueEventRequest {
  id: string;
  target_id: string;
  target_name: string;
  requester_name: string;
  note: string;
  status: EventRequestStatus;
  response_note: string;
  responded_at: string | null;
  created_at: string;
  offer: EventRequestOfferView | null;
}

/** The answer and offer a request row shows — one selection for the respond result and the list. */
export const EVENT_REQUEST_OFFER_FIELDS = `
  response_note
  responded_at
  offer {
    start_at
    end_at
    pax
    quote { total venue_payout }
  }
`;

export const RESPOND_TO_EVENT_REQUEST = gql`
  mutation RespondToEventRequest($id: ID!, $response: EventRequestResponse!, $note: String, $offer: EventRequestOfferInput) {
    respondToEventRequest(id: $id, response: $response, note: $note, offer: $offer) {
      id
      status
      closed_at
      ${EVENT_REQUEST_OFFER_FIELDS}
    }
  }
`;

/** The owner's venue requests, a page at a time (the phone list; the console uses the shared table). */
export const MY_VENUE_EVENT_REQUESTS = gql`
  query MyVenueEventRequests($query: TableQueryInput) {
    myReceivedEventRequestsTable(target_type: VENUE, query: $query) {
      total
      rows {
        id
        target_id
        target_name
        requester_name
        note
        status
        created_at
        ${EVENT_REQUEST_OFFER_FIELDS}
      }
    }
  }
`;

/** The server's price for a counter offer's window and terms, before it is sent. */
export const VENUE_OFFER_QUOTE = gql`
  query RespondOfferQuote($venue_id: ID!, $offer: VenueOfferInput!) {
    venueOfferQuote(venue_id: $venue_id, offer: $offer) {
      ok
      message
      quote { ${BREAKDOWN_FIELDS} }
    }
  }
`;
