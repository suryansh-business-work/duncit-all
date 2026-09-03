import { gql } from '@/generated/graphql';

/**
 * Venue Studio's per-venue figures and per-pod actions — the same operations
 * the Partners console's venue pods page fires (rule 27).
 */

/** The owner's KPIs, scoped to the venue the switcher has picked. */
export const VenueOwnerStatsDocument = gql(`
  query MobileVenueOwnerStats($venue_id: ID) {
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
`);

/** The Account Health penalty a venue pays for cancelling — admin-configured,
 * read fresh each time the cancel sheet opens so it never warns about a number
 * the server will not actually deduct. */
export const VenueCancelPenaltyDocument = gql(`
  query MobileVenueCancelPenalty {
    publicAppSettings {
      venue_cancel_health_penalty
    }
  }
`);

export const VenueCancelPodDocument = gql(`
  mutation MobileVenueCancelPod($pod_id: ID!, $reason: String!) {
    venueCancelPod(pod_id: $pod_id, reason: $reason) {
      pod_id
      health_penalty
      venue_health_score
      refunded_count
    }
  }
`);

/** The people behind a pod's attendee ids, for the detail sheet. */
export const VenuePodAttendeeProfilesDocument = gql(`
  query MobileVenuePodAttendeeProfiles($ids: [ID!]!) {
    publicUsersByIds(user_ids: $ids) {
      user_id
      full_name
      profile_photo
    }
  }
`);
