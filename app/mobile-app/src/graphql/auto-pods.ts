import { gql } from '@/generated/graphql';

/**
 * Auto Pods, for the three partners who enrol in one.
 *
 * An admin writes the pod with no venue, host or club; a venue, a host and a
 * club admin each enrol — in ANY order — and only once all three are on it does
 * it become an ordinary pod. The FIRST enrolment pins the offer to a city, and
 * from then on only partners in that city are offered it. Each role reads its
 * OWN queue — the server decides which offers a caller may see; the one filter
 * every queue carries is the city, and the host queue adds a sub-category.
 *
 * Every document selects the same fields the MUI surfaces do
 * (`@duncit/auto-pods`' `AUTO_POD_FIELDS`), because both feed the identical
 * `AutoPodRow` shape from `@duncit/utils` (rule 27). `sub_category_id` is the
 * one addition: the club picker filters to clubs in the Auto Pod's category,
 * and without it that filter has nothing to match on.
 *
 * The selection is written out in full in each document rather than shared
 * through a `${…}` const the way the MUI package does. This app's codegen uses
 * the `client` preset, which reads the STRING PASSED TO `gql()` at build time —
 * an interpolated template is not a literal, so codegen silently skips the
 * document, generates no type for it, and `gql()` finds nothing to return at
 * runtime. A duplicated selection is verbose; a silently unregistered query is
 * a screen that never loads.
 */

/** Open offers this venue may accept, plus the ones it already accepted. A
 * `location_id` narrows to offers pinned to that city plus every unpinned one. */
export const VenueAutoPodsDocument = gql(`
  query MobileVenueAutoPods($location_id: ID) {
    venueAutoPods(location_id: $location_id) {
      id
      auto_pod_no
      stage
      pod_title
      pod_description
      pod_images_and_videos {
        url
        type
      }
      sub_category_id
      category_name
      pod_amount
      no_of_spots
      viewer_claimed
      pod_id
      expected_host_earnings
      location {
        location_id
        location_name
        country
        state
        city
        bound_by
        bound_at
      }
      venue_claim {
        venue_id
        venue_slot_id
        owner_user_id
        venue_name
        pod_date_time
        pod_end_date_time
        slot_price
        accepted_at
      }
      host_claim {
        user_id
        host_name
        assigned_at
      }
      club_claim {
        club_id
        club_name
        user_id
        claimed_at
      }
    }
  }
`);

/** Offers this host may take, plus their own — optionally one sub-category. */
export const HostAutoPodsDocument = gql(`
  query MobileHostAutoPods($location_id: ID, $sub_category_id: ID) {
    hostAutoPods(location_id: $location_id, sub_category_id: $sub_category_id) {
      id
      auto_pod_no
      stage
      pod_title
      pod_description
      pod_images_and_videos {
        url
        type
      }
      sub_category_id
      category_name
      pod_amount
      no_of_spots
      viewer_claimed
      pod_id
      expected_host_earnings
      location {
        location_id
        location_name
        country
        state
        city
        bound_by
        bound_at
      }
      venue_claim {
        venue_id
        venue_slot_id
        owner_user_id
        venue_name
        pod_date_time
        pod_end_date_time
        slot_price
        accepted_at
      }
      host_claim {
        user_id
        host_name
        assigned_at
      }
      club_claim {
        club_id
        club_name
        user_id
        claimed_at
      }
    }
  }
`);

/** Offers this admin's clubs may claim, plus their own. */
export const ClubAdminAutoPodsDocument = gql(`
  query MobileClubAdminAutoPods($location_id: ID) {
    clubAdminAutoPods(location_id: $location_id) {
      id
      auto_pod_no
      stage
      pod_title
      pod_description
      pod_images_and_videos {
        url
        type
      }
      sub_category_id
      category_name
      pod_amount
      no_of_spots
      viewer_claimed
      pod_id
      expected_host_earnings
      location {
        location_id
        location_name
        country
        state
        city
        bound_by
        bound_at
      }
      venue_claim {
        venue_id
        venue_slot_id
        owner_user_id
        venue_name
        pod_date_time
        pod_end_date_time
        slot_price
        accepted_at
      }
      host_claim {
        user_id
        host_name
        assigned_at
      }
      club_claim {
        club_id
        club_name
        user_id
        claimed_at
      }
    }
  }
`);

/** Per-role counts of offers waiting on the caller — what the role switch reads
 * to decide whether switching lands on Auto Pods instead of the studio home. */
export const MyAutoPodActionCountsDocument = gql(`
  query MobileMyAutoPodActionCounts {
    myAutoPodActionCounts {
      venue
      host
      club
    }
  }
`);

/** Accepting and committing a slot are one step — an acceptance with no date
 * leaves the host and club admin nothing to enrol against. */
export const VenueAcceptAutoPodDocument = gql(`
  mutation MobileVenueAcceptAutoPod($auto_pod_doc_id: ID!, $venue_id: ID!, $slot_id: ID!) {
    venueAcceptAutoPod(auto_pod_doc_id: $auto_pod_doc_id, venue_id: $venue_id, slot_id: $slot_id) {
      id
      stage
      viewer_claimed
      location {
        location_id
        location_name
        country
        state
        city
        bound_by
        bound_at
      }
      venue_claim {
        venue_id
        venue_slot_id
        venue_name
        pod_date_time
        slot_price
        accepted_at
      }
    }
  }
`);

/** "Assign Myself" — the host takes the pod. `location_id` is REQUIRED on an
 * offer nobody has enrolled in yet (the host's city pins it) and null once the
 * offer is already pinned. */
export const HostAssignAutoPodDocument = gql(`
  mutation MobileHostAssignAutoPod($auto_pod_doc_id: ID!, $location_id: ID) {
    hostAssignAutoPod(auto_pod_doc_id: $auto_pod_doc_id, location_id: $location_id) {
      id
      stage
      viewer_claimed
      location {
        location_id
        location_name
        country
        state
        city
        bound_by
        bound_at
      }
      host_claim {
        user_id
        host_name
        assigned_at
      }
    }
  }
`);

/** "Claim for my club" — which club the resulting pod is created under. */
export const ClubClaimAutoPodDocument = gql(`
  mutation MobileClubClaimAutoPod($auto_pod_doc_id: ID!, $club_id: ID!) {
    clubClaimAutoPod(auto_pod_doc_id: $auto_pod_doc_id, club_id: $club_id) {
      id
      stage
      viewer_claimed
      location {
        location_id
        location_name
        country
        state
        city
        bound_by
        bound_at
      }
      club_claim {
        club_id
        club_name
        user_id
        claimed_at
      }
    }
  }
`);

/** Clubs the caller administers — a claim is made FOR one of them, and only a
 * club in the offer's pinned city may. The venue picker reuses
 * `VenueDashboardDocument` and the slot picker `VenueAvailableSlotsDocument`,
 * which already select exactly these fields. */
export const MyAdminClubsForAutoPodDocument = gql(`
  query MobileMyAdminClubsForAutoPod {
    myAdminClubs {
      id
      club_name
      category_id
      location_id
    }
  }
`);

/** The sub-categories this host is approved in — the host queue's category
 * filter offers exactly these. */
export const MyHostCategoriesForAutoPodDocument = gql(`
  query MobileMyHostCategoriesForAutoPod {
    myHost {
      id
      status
      is_active
      host_categories {
        sub_category_id
        sub_category_name
        category_name
        super_category_name
      }
    }
  }
`);
