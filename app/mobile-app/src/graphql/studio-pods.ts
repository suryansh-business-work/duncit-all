import { gql } from '@/generated/graphql';

/**
 * The pod lists behind the two partner studios — Venue Studio's "Pods hosted on
 * your Venue" and Club Studio's "Your Pods".
 *
 * Both root fields return the SAME row shape (VenuePod / ClubPod differ only in
 * venue_* vs club_*), which is what lets one Tamagui row render both — and lets
 * mWeb render the identical figures from the identical fields (rule 27).
 */

/** Every pod booked at the caller's venues, newest first. Scope comes from the
 * session (no venue_id = all owned venues). */
export const VenueStudioPodsDocument = gql(`
  query MobileVenueStudioPods {
    venuePods {
      id
      pod_slug
      pod_title
      pod_date_time
      pod_end_date_time
      pod_amount
      pod_type
      no_of_spots
      attendee_count
      pod_attendees
      host_names
      owner_id: venue_id
      owner_name: venue_name
      bucket
      is_active
      completed_at
      cancelled_at
      created_at
    }
    venuePodsSummary {
      scope_count
      total
      upcoming
      ongoing
      completed
      cancelled
      total_spots
      filled_spots
      total_attendees
      fill_rate
      next_pod_date_time
      total_revenue
      currency_symbol
    }
  }
`);

/**
 * Pods across the clubs the caller administers, plus the server-computed
 * roll-up.
 *
 * The summary is a separate root field on purpose: the list is capped at 500
 * rows while myClubPodsSummary counts EVERY pod in scope, and collected revenue
 * is not derivable from any field on a pod row.
 */
export const ClubStudioPodsDocument = gql(`
  query MobileClubStudioPods {
    myClubPods {
      id
      pod_slug
      pod_title
      pod_date_time
      pod_end_date_time
      pod_amount
      pod_type
      no_of_spots
      attendee_count
      pod_attendees
      host_names
      owner_id: club_id
      owner_name: club_name
      bucket
      is_active
      completed_at
      cancelled_at
      created_at
    }
    myClubPodsSummary {
      scope_count
      total
      upcoming
      ongoing
      completed
      cancelled
      total_spots
      filled_spots
      total_attendees
      fill_rate
      next_pod_date_time
      total_revenue
      currency_symbol
    }
  }
`);
