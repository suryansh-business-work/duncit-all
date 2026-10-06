import { gql } from '@apollo/client';

/** One public venue — null unless it is APPROVED and active (the not-found state). */
export const PUBLIC_VENUE = gql`
  query PublicVenueDetails($venueId: ID!) {
    publicVenue(venue_id: $venueId) {
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

export interface PublicVenue {
  id: string;
  venue_name: string;
  venue_type: string;
  capacity: number;
  description: string | null;
  location_id: string | null;
  amenities: string[];
  facilities: string[];
  security: string[];
  cover_image_url: string | null;
  gallery: string[];
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  locality: string | null;
  postal_code: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  tags: string[];
}
