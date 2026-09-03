import { gql } from '@apollo/client';

/**
 * Every Auto Pod document the MUI surfaces send. They live here rather than in
 * each page so mWeb, Partners and Admin cannot drift on which fields a card
 * reads — the selection and the card that renders it ship together.
 */
const AUTO_POD_FIELDS = `
  id
  auto_pod_no
  stage
  is_active
  pod_title
  pod_description
  pod_images_and_videos {
    url
    type
  }
  sub_category_id
  category_name
  pod_mode
  pod_amount
  no_of_spots
  viewer_claimed
  pod_id
  expected_host_earnings
  venue_expires_at
  withdraw_penalty_points
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
  location {
    location_id
    location_name
    country
    state
    city
    bound_by
    bound_at
  }
`;

/**
 * The three queue queries take the SAME variables — `location_id` narrows to
 * one city (an offer nobody has enrolled in yet has no city and always shows),
 * `sub_category_id` narrows a host's queue to one of their categories, and
 * `venue_id` narrows the venue queue to what ONE of the owner's venues could
 * take. A page passes `null` for "all", so one hook can drive all three.
 */
export interface AutoPodQueueVariables {
  location_id?: string | null;
  sub_category_id?: string | null;
  venue_id?: string | null;
}

export const VENUE_AUTO_PODS = gql`
  query VenueAutoPods($location_id: ID, $venue_id: ID) {
    venueAutoPods(location_id: $location_id, venue_id: $venue_id) {
      ${AUTO_POD_FIELDS}
    }
  }
`;

export const HOST_AUTO_PODS = gql`
  query HostAutoPods($location_id: ID, $sub_category_id: ID) {
    hostAutoPods(location_id: $location_id, sub_category_id: $sub_category_id) {
      ${AUTO_POD_FIELDS}
    }
  }
`;

export const CLUB_ADMIN_AUTO_PODS = gql`
  query ClubAdminAutoPods($location_id: ID) {
    clubAdminAutoPods(location_id: $location_id) {
      ${AUTO_POD_FIELDS}
    }
  }
`;

export const AUTO_POD_ACTION_COUNTS = gql`
  query MyAutoPodActionCounts {
    myAutoPodActionCounts {
      venue
      host
      club
    }
  }
`;

export const VENUE_ACCEPT_AUTO_POD = gql`
  mutation VenueAcceptAutoPod($auto_pod_doc_id: ID!, $venue_id: ID!, $slot_id: ID!) {
    venueAcceptAutoPod(auto_pod_doc_id: $auto_pod_doc_id, venue_id: $venue_id, slot_id: $slot_id) {
      ${AUTO_POD_FIELDS}
    }
  }
`;

/** `location_id` is the city the host had selected: it pins a virtual offer
 * nobody has enrolled in yet, and must match the city of one that is already
 * pinned. The price and spots are the host's own numbers on the pod. */
export const HOST_ASSIGN_AUTO_POD = gql`
  mutation HostAssignAutoPod($auto_pod_doc_id: ID!, $location_id: ID, $pod_amount: Float, $no_of_spots: Int) {
    hostAssignAutoPod(
      auto_pod_doc_id: $auto_pod_doc_id
      location_id: $location_id
      pod_amount: $pod_amount
      no_of_spots: $no_of_spots
    ) {
      ${AUTO_POD_FIELDS}
    }
  }
`;

/**
 * What the host's numbers add up to on this offer — under their own rates,
 * the venue's slot price and the club admin's cut — plus the spot limits the
 * activity and the venue impose. Re-read on every change of price or spots.
 */
export const AUTO_POD_HOST_PROJECTION = gql`
  query AutoPodHostProjection($auto_pod_doc_id: ID!, $pod_amount: Float!, $no_of_spots: Int!) {
    autoPodHostProjection(auto_pod_doc_id: $auto_pod_doc_id, pod_amount: $pod_amount, no_of_spots: $no_of_spots) {
      min_spots
      max_spots
      pod_amount
      no_of_spots
      total_collection
      gst_amount
      platform_fee_amount
      venue_amount
      club_admin_amount
      host_receives
      viable
    }
  }
`;

/** A venue takes its slot back; the offer returns to venues' lists. */
export const VENUE_WITHDRAW_AUTO_POD = gql`
  mutation VenueWithdrawAutoPod($auto_pod_doc_id: ID!) {
    venueWithdrawAutoPod(auto_pod_doc_id: $auto_pod_doc_id) {
      ${AUTO_POD_FIELDS}
    }
  }
`;

/** A host steps off; the offer returns to hosts' lists. */
export const HOST_WITHDRAW_AUTO_POD = gql`
  mutation HostWithdrawAutoPod($auto_pod_doc_id: ID!) {
    hostWithdrawAutoPod(auto_pod_doc_id: $auto_pod_doc_id) {
      ${AUTO_POD_FIELDS}
    }
  }
`;

export const CLUB_CLAIM_AUTO_POD = gql`
  mutation ClubClaimAutoPod($auto_pod_doc_id: ID!, $club_id: ID!) {
    clubClaimAutoPod(auto_pod_doc_id: $auto_pod_doc_id, club_id: $club_id) {
      ${AUTO_POD_FIELDS}
    }
  }
`;

/** The venue owner's own venues — the queue's picker, with the category each
 * one declares (which is what decides the offers it is shown). */
export const MY_VENUES_FOR_AUTO_POD = gql`
  query MyVenuesForAutoPod {
    myVenues {
      id
      venue_name
      status
      is_active
      location_id
      city
      venue_category {
        sub_category_id
        super_category_name
        category_name
        sub_category_name
      }
    }
  }
`;

/**
 * The chosen venue's free slots for ONE offer: the next few days (Pod
 * Settings decides how many), nearest first, each with what the venue would
 * be paid after Finance's deductions — and whether the pod's money could
 * cover it at all.
 */
export const AUTO_POD_VENUE_SLOTS = gql`
  query AutoPodVenueSlots($auto_pod_doc_id: ID!, $venue_id: ID!) {
    autoPodVenueSlots(auto_pod_doc_id: $auto_pod_doc_id, venue_id: $venue_id) {
      window_days
      expires_at
      slots {
        id
        start_at
        end_at
        whole_day
        space_label
        capacity
        price
        venue_receives
        venue_commission_pct
        host_receives
        viable
      }
    }
  }
`;

/** Clubs the caller administers — a claim is made FOR one of them. */
export const MY_ADMIN_CLUBS_FOR_AUTO_POD = gql`
  query MyAdminClubsForAutoPod {
    myAdminClubs {
      id
      club_name
      category_id
      location_id
    }
  }
`;

/** The sub-categories this host is approved in — the host queue's category
 * filter offers exactly these. */
export const MY_HOST_CATEGORIES_FOR_AUTO_POD = gql`
  query MyHostCategoriesForAutoPod {
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
`;

/** Active admin locations — the Country → State → City filter every queue page
 * shows at the top reads from these. */
export const AUTO_POD_LOCATIONS = gql`
  query AutoPodLocations {
    locations(filter: { is_active: true }) {
      id
      location_name
      country
      country_code
      state
      state_code
      city
    }
  }
`;
