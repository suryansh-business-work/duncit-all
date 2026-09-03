import { gql } from '@apollo/client';

/** Bookings feeding the "Pods at your venue" bar chart (counts only). */
export const PODS_AT_VENUE = gql`
  query PodsAtMyVenue($venue_id: ID!) {
    pods(filter: { venue_id: $venue_id, is_active: true }) {
      id
      pod_date_time
    }
  }
`;

/**
 * Every venue the signed-in partner owns, newest first — the switcher's list
 * AND the detail of whichever one it lands on.
 *
 * This used to be `myVenue`, which answers with the server's own pick and can
 * therefore only ever show one venue. Reading the list instead is what makes
 * switching possible, and costs no extra round trip: `myVenues` already returns
 * the full venue, so the page still asks exactly one question here.
 */
export const MY_VENUES_DETAILS = gql`
  query MyVenuesDetails {
    myVenues {
      id
      venue_name
      venue_type
      capacity
      description
      cover_image_url
      country
      city
      state
      locality
      postal_code
      amenities
      tags
      status
      approved_at
    }
  }
`;

/**
 * The owner's slot KPIs for the venue the switcher selected — the "Slot
 * earnings" strip and the pending count on the Slot requests action. Tile
 * order and formatting are `venueOwnerStatTiles` in @duncit/utils.
 */
export const VENUE_OWNER_STATS = gql`
  query VenueStudioOwnerStats($venue_id: ID) {
    venueOwnerStats(venue_id: $venue_id) {
      total_venues
      approved_venues
      total_capacity
      potential_earning
      booked_earning
      upcoming_slots
      booked_slots
      pending_requests
    }
  }
`;

/**
 * The Account Health penalty a venue pays for cancelling, straight from Admin >
 * Pods > Pod Settings. Its own operation name (never `PublicAppSettings`) so it
 * cannot thrash the shared document's normalized cache entry.
 */
export const VENUE_CANCEL_PENALTY = gql`
  query VenueStudioCancelPenalty {
    publicAppSettings {
      venue_cancel_health_penalty
    }
  }
`;

export const VENUE_CANCEL_POD = gql`
  mutation VenueStudioCancelPod($pod_id: ID!, $reason: String!) {
    venueCancelPod(pod_id: $pod_id, reason: $reason) {
      pod_id
      health_penalty
      venue_health_score
      refunded_count
    }
  }
`;

/** Names and photos for a pod's attendee ids — the detail sheet's list. */
export const VENUE_POD_ATTENDEES = gql`
  query VenueStudioPodAttendees($ids: [ID!]!) {
    publicUsersByIds(user_ids: $ids) {
      user_id
      full_name
      profile_photo
    }
  }
`;

export interface AttendeeProfile {
  user_id: string;
  full_name: string | null;
  profile_photo: string | null;
}
