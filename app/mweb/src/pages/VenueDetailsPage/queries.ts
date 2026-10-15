import { gql } from '@apollo/client';
import type { VenueFoodItem, VenueFoodLicences, VenueFoodOrdering } from '@duncit/utils';

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
      videos
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
      offers_food
      food_menu {
        id
        name
        description
        category
        price
        images
        diet
        spice_level
        is_available
        videos
        original_price
        saving_display
      }
      food_licences {
        fssai_number
      }
      food_ordering {
        enabled
        discount_pct
        tax_mode
        gst_pct
      }
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
  /** Uploaded clips and YouTube links — read through `venueVideosOf`. */
  videos?: string[];
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
  /** The venue serves food — the page then opens on its Menu tab. */
  offers_food: boolean;
  /** Empty unless `offers_food`. */
  food_menu: VenueFoodItem[];
  food_ordering: VenueFoodOrdering;
  /** Only the FSSAI number is selected — the menu prints it at its foot. */
  food_licences?: Pick<VenueFoodLicences, 'fssai_number'> | null;
}
