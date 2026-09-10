import { gql } from '@apollo/client';

/**
 * The dashboard counts, one document per entity.
 *
 * Each is a SINGLE round trip with every tile's number aliased beside the
 * others. Four separate queries would let four tiles report four different
 * moments — a venue approved between request two and three would be counted as
 * both pending and approved, and the tiles would not add up to the total.
 *
 * `page_size: 1` because only `total` is read; asking for a page of rows to
 * throw them away is the same query at twenty times the cost.
 *
 * Every filter field here is on the entity's server-side `filterFields`
 * allowlist. A field that is not on it does not come back empty — the table
 * engine rejects the query, so the whole dashboard errors.
 */

/** Venues: status is the whole story (DRAFT → SUBMITTED → APPROVED/REJECTED). */
export const VENUE_COUNTS = gql`
  query VenueDirectoryCounts {
    total: venuesTable(query: { page_size: 1 }) {
      total
    }
    approved: venuesTable(
      query: { page_size: 1, filters: [{ field: "status", op: eq, value: "APPROVED" }] }
    ) {
      total
    }
    pending: venuesTable(
      query: { page_size: 1, filters: [{ field: "status", op: eq, value: "SUBMITTED" }] }
    ) {
      total
    }
    declined: venuesTable(
      query: { page_size: 1, filters: [{ field: "status", op: eq, value: "REJECTED" }] }
    ) {
      total
    }
  }
`;

/**
 * Clubs have no status field — a club is live or it is not, and separately
 * verified or not. So the tiles read `is_active` and `is_verified`, which are
 * what the club table actually allows filtering on.
 */
export const CLUB_COUNTS = gql`
  query ClubDirectoryCounts {
    total: clubsTable(query: { page_size: 1 }) {
      total
    }
    active: clubsTable(query: { page_size: 1, filters: [{ field: "is_active", op: is_true }] }) {
      total
    }
    verified: clubsTable(query: { page_size: 1, filters: [{ field: "is_verified", op: is_true }] }) {
      total
    }
    inactive: clubsTable(query: { page_size: 1, filters: [{ field: "is_active", op: is_false }] }) {
      total
    }
  }
`;

/** Club admins: a drafted record is one nobody has reviewed yet. */
export const CLUB_ADMIN_COUNTS = gql`
  query ClubAdminDirectoryCounts {
    total: clubAdminProfilesTable(query: { page_size: 1 }) {
      total
    }
    approved: clubAdminProfilesTable(
      query: { page_size: 1, filters: [{ field: "status", op: eq, value: "APPROVED" }] }
    ) {
      total
    }
    pending: clubAdminProfilesTable(
      query: { page_size: 1, filters: [{ field: "status", op: eq, value: "DRAFT" }] }
    ) {
      total
    }
    declined: clubAdminProfilesTable(
      query: { page_size: 1, filters: [{ field: "status", op: eq, value: "REJECTED" }] }
    ) {
      total
    }
  }
`;

/** Hosts follow the venue shape — the same application lifecycle. */
export const HOST_COUNTS = gql`
  query HostDirectoryCounts {
    total: hostsTable(query: { page_size: 1 }) {
      total
    }
    approved: hostsTable(
      query: { page_size: 1, filters: [{ field: "status", op: eq, value: "APPROVED" }] }
    ) {
      total
    }
    pending: hostsTable(
      query: { page_size: 1, filters: [{ field: "status", op: eq, value: "SUBMITTED" }] }
    ) {
      total
    }
    declined: hostsTable(
      query: { page_size: 1, filters: [{ field: "status", op: eq, value: "REJECTED" }] }
    ) {
      total
    }
  }
`;
