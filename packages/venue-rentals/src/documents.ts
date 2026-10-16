import { gql, type TypedDocumentNode } from '@apollo/client';
import {
  ADMIN_RENTAL_ITEMS_QUERY,
  OWNER_RENTAL_ITEMS_QUERY,
  RENTAL_ITEMS_CONFIG_QUERY,
  UPDATE_VENUE_RENTALS_MUTATION,
  type RentalItemsConfig,
  type RentalsVenue,
  MARK_RENTAL_BOOKING_MUTATION,
  MARK_RENTAL_REFUNDED_MUTATION,
  RENTAL_BOOKINGS_TABLE_QUERY,
  VENUE_RENTAL_BOOKINGS_TABLE_QUERY,
  VENUE_RENTAL_STATS_QUERY,
  type RentalBookingRow,
  type RentalVenueStats,
  type toVenueRentalsInput,
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

export const MARK_RENTAL_REFUNDED: TypedDocumentNode<
  { markRentalRefunded: RentalBookingRow },
  { id: string; reference: string }
> = gql(MARK_RENTAL_REFUNDED_MUTATION);

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
