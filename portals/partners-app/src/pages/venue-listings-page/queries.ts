import { gql } from '@apollo/client';

/** Row shape for the "Your venue registrations" table (myVenuesTable rows). */
export interface VenueListingRow {
  id: string;
  status: string;
  venue_name?: string | null;
  venue_type?: string | null;
  city?: string | null;
  locality?: string | null;
  capacity?: number | null;
  cover_image_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export const MY_VENUES_TABLE = gql`
  query MyVenuesTable($query: TableQueryInput) {
    myVenuesTable(query: $query) {
      total
      rows {
        id
        status
        venue_name
        venue_type
        city
        locality
        capacity
        cover_image_url
        created_at
        updated_at
      }
    }
  }
`;
