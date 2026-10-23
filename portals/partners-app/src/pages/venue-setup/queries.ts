import { gql } from '@apollo/client';

/** One Venue Options setup page's save — only the fields that page sends change. */
export const UPDATE_VENUE_SETUP = gql`
  mutation UpdateVenueSetup($venue_id: ID!, $input: VenueSetupInput!) {
    updateVenueSetup(venue_id: $venue_id, input: $input) {
      id
      venue_type
      capacity
      capacity_items {
        label
        capacity
      }
      amenities
      facilities
      security
      offers_food
      gstin
    }
  }
`;
