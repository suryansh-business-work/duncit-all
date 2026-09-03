import { gql } from '@apollo/client';

/** One of the signed-in admin's clubs, as the "Your clubs" list shows it. */
export interface AdminClubRow {
  id: string;
  club_name: string;
  slug: string;
  cover_image_url: string | null;
  category: string | null;
  locality: string | null;
  followers_count: number;
  total_pods: number;
  upcoming_pods: number;
  is_verified: boolean;
}

/**
 * The clubs the signed-in user administers, with the figures a row shows.
 * `myAdminClubsTable` rather than `myAdminClubsPage`: the plain `Club` carries
 * neither its pod counts nor its category's name, and both are on the row.
 * The row set is pre-scoped to the caller's memberships server-side.
 */
export const MWEB_MY_ADMIN_CLUBS = gql`
  query MwebMyAdminClubs($query: TableQueryInput) {
    myAdminClubsTable(query: $query) {
      total
      rows {
        id
        club_name
        slug
        cover_image_url
        category
        locality
        followers_count
        total_pods
        upcoming_pods
        is_verified
      }
    }
  }
`;
