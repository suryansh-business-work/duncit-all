import { gql } from '@apollo/client';

/** Max-info row shape for the "Your Clubs" table (myAdminClubsTable rows). */
export interface ClubAdminClubInfoRow {
  id: string;
  club_name: string;
  slug: string;
  cover_image_url?: string | null;
  super_category?: string | null;
  category?: string | null;
  locality?: string | null;
  location_label?: string | null;
  followers_count: number;
  total_pods: number;
  upcoming_pods: number;
  matched_venues_count: number;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

export const MY_ADMIN_CLUBS_TABLE = gql`
  query MyAdminClubsTable($query: TableQueryInput) {
    myAdminClubsTable(query: $query) {
      total
      rows {
        id
        club_name
        slug
        cover_image_url
        super_category
        category
        locality
        location_label
        followers_count
        total_pods
        upcoming_pods
        matched_venues_count
        is_verified
        is_active
        created_at
      }
    }
  }
`;
