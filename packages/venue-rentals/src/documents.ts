import { gql, type TypedDocumentNode } from '@apollo/client';
import {
  ADMIN_RENTAL_ITEMS_QUERY,
  OWNER_RENTAL_ITEMS_QUERY,
  RENTAL_ITEMS_CONFIG_QUERY,
  UPDATE_VENUE_RENTALS_MUTATION,
  type RentalItemsConfig,
  type RentalsVenue,
  MARK_RENTAL_BOOKING_MUTATION,
  RENTAL_BOOKINGS_TABLE_QUERY,
  VENUE_RENTAL_BOOKINGS_TABLE_QUERY,
  VENUE_RENTAL_STATS_QUERY,
  PUBLIC_RENTAL_SETTINGS_QUERY,
  type PublicRentalSettings,
  type RentalBookingRow,
  type RentalVenueStats,
  type toVenueRentalsInput,
  RENTAL_BOOKING_DETAIL_QUERY,
  SEND_RENTAL_REFUND_MUTATION,
  ADD_RENTAL_BOOKING_PROOF_MUTATION,
  type RentalBookingDetail,
  type RentalProofValues,
} from '@duncit/utils';

/**
 * The rental desk's documents, parsed once for Apollo. The text is
 * @duncit/utils' — the same strings the native app parses.
 */

export interface MarkRentalInput {
  outcome: 'RETURNED' | 'DAMAGED';
  damage_claim?: number | null;
  note?: string | null;
}

export const RENTAL_BOOKINGS_TABLE = gql(RENTAL_BOOKINGS_TABLE_QUERY);

export const VENUE_RENTAL_BOOKINGS_TABLE = gql(VENUE_RENTAL_BOOKINGS_TABLE_QUERY);

export const VENUE_RENTAL_STATS: TypedDocumentNode<{ venueRentalStats: RentalVenueStats }, { venue_id: string }> =
  gql(VENUE_RENTAL_STATS_QUERY);

export const MARK_RENTAL_BOOKING: TypedDocumentNode<
  { markRentalBooking: RentalBookingRow },
  { id: string; input: MarkRentalInput }
> = gql(MARK_RENTAL_BOOKING_MUTATION);

/** One rental, whole: Finance's view or its venue's, decided by the server. */
export const RENTAL_BOOKING_DETAIL: TypedDocumentNode<{ rentalBookingDetail: RentalBookingDetail }, { id: string }> =
  gql(RENTAL_BOOKING_DETAIL_QUERY);

/** Finance sends a refund that waited for review through Razorpay; nothing is ever marked paid by hand. */
export const SEND_RENTAL_REFUND: TypedDocumentNode<{ sendRentalRefund: RentalBookingDetail }, { id: string; note: string }> =
  gql(SEND_RENTAL_REFUND_MUTATION);

/** An optional note and/or photos on a rental, from Finance or the venue. */
export const ADD_RENTAL_BOOKING_PROOF: TypedDocumentNode<
  { addRentalBookingProof: RentalBookingDetail },
  { id: string; input: RentalProofValues }
> = gql(ADD_RENTAL_BOOKING_PROOF_MUTATION);

/** Finance's rules, read by the mark dialog to say what the venue hands back. */
export const PUBLIC_RENTAL_SETTINGS: TypedDocumentNode<{ publicRentalSettings: PublicRentalSettings }, Record<string, never>> =
  gql(PUBLIC_RENTAL_SETTINGS_QUERY);

export const OWNER_RENTAL_ITEMS: TypedDocumentNode<{ myVenue: RentalsVenue | null }, { venue_id: string }> =
  gql(OWNER_RENTAL_ITEMS_QUERY);

export const ADMIN_RENTAL_ITEMS: TypedDocumentNode<{ venue: RentalsVenue | null }, { venue_id: string }> =
  gql(ADMIN_RENTAL_ITEMS_QUERY);

export const RENTAL_ITEMS_CONFIG: TypedDocumentNode<{ venueRegistrationConfig: RentalItemsConfig }, Record<string, never>> =
  gql(RENTAL_ITEMS_CONFIG_QUERY);

export const UPDATE_VENUE_RENTALS: TypedDocumentNode<
  { updateApprovedVenue: RentalsVenue },
  { venue_id: string; input: ReturnType<typeof toVenueRentalsInput> }
> = gql(UPDATE_VENUE_RENTALS_MUTATION);
