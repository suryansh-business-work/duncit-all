import { gql } from '@apollo/client';

/** Lightweight user directory search for the Club Admins assign-picker.
 * Backed by users(filter:{ search }) — matches name/email/phone server-side. */
export const USERS_PICKER = gql`
  query ClubAdminUserPicker($filter: UsersFilter) {
    users(filter: $filter) {
      user_id
      full_name
      email
      profile_photo
    }
  }
`;

/** APPROVED, active venues that auto-match a club by location + Super/Sub
 * category — shown read-only so admins see the live linkage. */
export const MATCHING_VENUES = gql`
  query MatchingVenuesForClub(
    $location_id: ID!
    $locality: String
    $super_category_id: ID
    $category_id: ID
  ) {
    matchingVenues(
      location_id: $location_id
      locality: $locality
      super_category_id: $super_category_id
      category_id: $category_id
    ) {
      id
      venue_name
      locality
      city
      state
    }
  }
`;
