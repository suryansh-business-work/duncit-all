import { gql } from '@apollo/client';

/**
 * The selection both studios read. `venuePods` and `myClubPods` return the same
 * fields, so the owning venue/club is aliased to `owner_id`/`owner_name` and one
 * TypeScript type covers both results — no mapping layer, nothing to drift.
 *
 * Both documents live in this file so the repo's GraphQL gate
 * (`scripts/verify-gql-documents.mjs`) resolves the interpolation for real
 * instead of substituting a placeholder.
 */
const STUDIO_POD_FIELDS = `
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
  bucket
  is_active
  completed_at
  cancelled_at
  created_at
`;

/** Pods booked at the caller's venue — Venue Studio. */
export const VENUE_STUDIO_PODS = gql`
  query VenueStudioPods($venue_id: ID) {
    studioPods: venuePods(venue_id: $venue_id) {
      ${STUDIO_POD_FIELDS}
      owner_id: venue_id
      owner_name: venue_name
    }
  }
`;

/**
 * Pods across the clubs the caller administers — Club Studio. The summary is
 * fetched alongside the list because the server computes it over EVERY pod in
 * scope while the list itself is capped at 500 rows.
 */
export const CLUB_STUDIO_PODS = gql`
  query ClubStudioPods($club_id: ID) {
    studioPods: myClubPods(club_id: $club_id) {
      ${STUDIO_POD_FIELDS}
      owner_id: club_id
      owner_name: club_name
    }
    studioSummary: myClubPodsSummary(club_id: $club_id) {
      clubs
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
`;
