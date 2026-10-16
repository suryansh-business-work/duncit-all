import { gql } from '@/generated/graphql';

/**
 * Rented items — the same operations mWeb sends (`@duncit/utils`
 * venue-rentals), re-declared inline because the app's codegen only sees
 * documents written in this workspace.
 */

/** What a pod's venue rents out, and how much is left for this pod. */
export const PodRentalsDocument = gql(`
  query MobilePodRentals($pod_id: ID!) {
    podRentals(pod_id: $pod_id) {
      open
      closed_reason
      hours
      currency_symbol
      venue_terms_html
      items {
        id
        name
        description
        images
        unit
        rate
        deposit
        available
        per_guest_limit
      }
    }
  }
`);

/** The rental terms and refund rules a guest agrees to. */
export const PublicRentalSettingsDocument = gql(`
  query MobilePublicRentalSettings {
    publicRentalSettings {
      enabled
      terms_html
      rent_refundable_on_backout
      deposit_refundable
      booking_cutoff_hours
    }
  }
`);

/** The member's own rented items, newest first. */
export const MyRentalBookingsDocument = gql(`
  query MobileMyRentalBookings($limit: Int, $offset: Int) {
    myRentalBookings(limit: $limit, offset: $offset) {
      id
      currency_symbol
      pod_title
      name
      image_url
      unit
      units
      quantity
      rent_amount
      deposit_amount
      status
      damage_claim
      refund_due
      refund_status
      created_at
    }
  }
`);

/** Upcoming pods a guest can still rent items for — Pod Rent on the Shop screen. */
export const RentablePodsDocument = gql(`
  query MobileRentablePods($limit: Int) {
    rentablePods(limit: $limit) {
      id
      pod_id
      club_id
      pod_title
      pod_date_time
      cover_url
      venue_name
      item_count
      from_rate
      currency_symbol
    }
  }
`);
