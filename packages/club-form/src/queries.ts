import { gql } from '@apollo/client';

/** Lightweight user directory search for the Club Admin assign-picker.
 * Backed by users(filter:{ role, search }) — the role narrows the directory to
 * CLUB_ADMIN holders, and search matches name/email/phone server-side. */
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

/**
 * Club Admins whose onboarding taxonomy matches THIS club's category.
 *
 * Replaces a plain `users(filter:{ role: CLUB_ADMIN })` directory search, which
 * offered every role-holder on the platform — so a club could be handed to an
 * admin onboarded for an unrelated category. Passing no category returns
 * everyone, so the picker still works before one is chosen.
 */
export const CLUB_ADMIN_CANDIDATES = gql`
  query ClubAdminCandidatesForClub(
    $super_category_id: ID
    $category_id: ID
    $sub_category_id: ID
    $search: String
  ) {
    clubAdminCandidates(
      super_category_id: $super_category_id
      category_id: $category_id
      sub_category_id: $sub_category_id
      search: $search
    ) {
      user_id
      full_name
      email
    }
  }
`;
