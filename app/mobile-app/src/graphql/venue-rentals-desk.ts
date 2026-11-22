import { gql } from '@/generated/graphql';

/**
 * A venue's rental desk on the app — the same operations @duncit/venue-rentals
 * sends on the web (`@duncit/utils` venue-rentals), re-declared inline because
 * the app's codegen only sees documents written in this workspace.
 */

/** The owner's rented items, their terms, and the editor's caps. */
export const OwnerRentalItemsDocument = gql(`
  query MobileOwnerRentalItems($venue_id: ID!) {
    myVenue(venue_id: $venue_id) {
      id
      venue_name
      status
      offers_rentals
      rental_terms_html
      rental_deposit_gst
      rental_items {
        id
        name
        description
        images
        unit
        rate
        deposit
        stock
        per_guest_limit
        is_available
        categories {
          super_category_id
          category_id
          sub_category_id
          super_category_name
          category_name
          sub_category_name
        }
      }
    }
    venueRegistrationConfig {
      rental_units
      rental_item_limit
      rental_image_limit
      rental_rate_max
      rental_deposit_max
      rental_stock_max
      rental_per_guest_max
      rental_terms_max
      rental_category_limit
    }
  }
`);

/** Saves the whole list (each kept item with its id) through the approved-venue edit. */
export const UpdateVenueRentalsDocument = gql(`
  mutation MobileUpdateVenueRentals($venue_id: ID!, $input: UpdateApprovedVenueInput!) {
    updateApprovedVenue(venue_id: $venue_id, input: $input) {
      id
      offers_rentals
      rental_terms_html
      rental_items {
        id
        name
        description
        images
        unit
        rate
        deposit
        stock
        per_guest_limit
        is_available
        categories {
          super_category_id
          category_id
          sub_category_id
          super_category_name
          category_name
          sub_category_name
        }
      }
    }
  }
`);

/** The venue's rental bookings, newest first, and its numbers. */
export const VenueRentalDeskDocument = gql(`
  query MobileVenueRentalDesk($venue_id: ID!, $query: TableQueryInput) {
    venueRentalBookingsTable(venue_id: $venue_id, query: $query) {
      total
      rows {
        id
        currency_symbol
        pod_title
        guest_name
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
        refund_state
        deposit_at_venue
        venue_amount
        created_at
      }
    }
    venueRentalStats(venue_id: $venue_id) {
      currency_symbol
      bookings
      open
      rent_total
      deposits_held
      earned
      paid_out
    }
    publicRentalSettings {
      deposit_refundable
    }
  }
`);

/** The item came back, or part of the deposit is kept for damage. */
export const MarkRentalBookingDocument = gql(`
  mutation MobileMarkRentalBooking($id: ID!, $input: MarkRentalBookingInput!) {
    markRentalBooking(id: $id, input: $input) {
      id
      status
      damage_claim
      refund_due
      refund_status
      refund_state
      deposit_at_venue
      venue_amount
    }
  }
`);

/**
 * One rental as its venue sees it (the server gives the venue no email, no
 * payment and no Razorpay ids, so none are asked for).
 */
export const RentalBookingDetailFragment = gql(`
  fragment MobileRentalBookingDetail on RentalBookingDetail {
    booking {
      id
      currency_symbol
      name
      image_url
      unit
      rate
      units
      quantity
      rent_amount
      deposit_amount
      status
      damage_claim
      damage_note
      refund_due
      refund_status
      deposit_at_venue
      venue_amount
      marked_at
      created_at
      refund_state
      refund_eligible
      refund_pending
      refunded_amount
      refund_outstanding
      refund_review_reason
      deposit_policy
    }
    guest {
      name
      phone
    }
    venue {
      name
      contact_name
      phone
      address
    }
    pod {
      title
      starts_at
      ends_at
    }
    refunds {
      id
      source
      status
      amount
      requested_at
      processed_at
      created_at
    }
    proofs {
      note
      image_urls
      added_by_name
      added_by_role
      added_at
    }
    events {
      type
      at
      actor_name
      actor_role
      amount
      detail
    }
  }
`);

/** The rental, whole: item, guest, pod, return-to venue, money, refund, proofs and activity. */
export const RentalBookingDetailDocument = gql(`
  query MobileRentalBookingDetail($id: ID!) {
    rentalBookingDetail(id: $id) {
      ...MobileRentalBookingDetail
    }
  }
`);

/** Optional proof on the rental: a note, photos, or both. Answers with the whole rental. */
export const AddRentalBookingProofDocument = gql(`
  mutation MobileAddRentalBookingProof($id: ID!, $input: RentalProofInput!) {
    addRentalBookingProof(id: $id, input: $input) {
      ...MobileRentalBookingDetail
    }
  }
`);
