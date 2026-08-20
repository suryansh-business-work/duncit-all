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
`;

export const VENUE_AUTO_PODS = gql`
  query VenueAutoPods {
    venueAutoPods {
      ${AUTO_POD_FIELDS}
    }
  }
`;

export const HOST_AUTO_PODS = gql`
  query HostAutoPods {
    hostAutoPods {
      ${AUTO_POD_FIELDS}
    }
  }
`;

export const CLUB_ADMIN_AUTO_PODS = gql`
  query ClubAdminAutoPods {
    clubAdminAutoPods {
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

export const HOST_ASSIGN_AUTO_POD = gql`
  mutation HostAssignAutoPod($auto_pod_doc_id: ID!) {
    hostAssignAutoPod(auto_pod_doc_id: $auto_pod_doc_id) {
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

/** The venue owner's own venues — used to pick which one accepts an offer. */
export const MY_VENUES_FOR_AUTO_POD = gql`
  query MyVenuesForAutoPod {
    myVenues {
      id
      venue_name
      status
      is_active
    }
  }
`;

/** Free slots on the chosen venue, which is what the venue commits on accept. */
export const VENUE_AVAILABLE_SLOTS_FOR_AUTO_POD = gql`
  query VenueAvailableSlotsForAutoPod($venue_id: ID!) {
    venueAvailableSlots(venue_id: $venue_id) {
      id
      start_at
      end_at
      whole_day
      price
      space_label
      capacity
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
    }
  }
`;
