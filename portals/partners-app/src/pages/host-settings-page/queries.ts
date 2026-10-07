import { gql } from '@apollo/client';
import type { Host } from '@duncit/gql-types';

/** The host's own monthly Pod Request cap and Duncit's override of it. */
export const MY_HOST_SETTINGS = gql`
  query PartnersMyHostSettings {
    myHost {
      id
      max_venue_requests_per_month
      venue_requests_limit_override
    }
  }
`;

export const SET_MY_VENUE_REQUEST_LIMIT = gql`
  mutation PartnersSetMyVenueRequestLimit($limit: Int!) {
    setMyVenueRequestLimit(limit: $limit) {
      id
      max_venue_requests_per_month
    }
  }
`;

export type HostSettings = Pick<Host, 'id' | 'max_venue_requests_per_month' | 'venue_requests_limit_override'>;
