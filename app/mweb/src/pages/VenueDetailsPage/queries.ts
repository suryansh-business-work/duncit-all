import { gql } from '@apollo/client';

export const PUBLIC_VENUES = gql`
  query PublicVenueDetails {
    publicVenues {
      id
      venue_name
      venue_type
      capacity
      description
      location_id
      amenities
      facilities
      security
      cover_image_url
      gallery
      address_line1
      address_line2
      city
      state
      locality
      postal_code
      country
      lat
      lng
      tags
    }
  }
`;
