/**
 * `@duncit/venue-rentals` — a venue's rented items as its owner and Finance
 * work them, as ONE MUI set for the Finance, Venues and Partners consoles.
 *
 * Each tool takes the venue it is about; picking the venue stays with the page
 * that mounts it. The contract (documents, labels, price math) is
 * @duncit/utils' `venue-rentals`, so the native app reads the same.
 */
export { default as VenueRentalDesk, type VenueRentalDeskProps } from './VenueRentalDesk';
export { default as VenueRentalItems, type VenueRentalItemsProps } from './items/VenueRentalItems';
export { default as VenueRentalBookings } from './bookings/VenueRentalBookings';
export { default as FinanceRentalBookings } from './bookings/FinanceRentalBookings';
export { default as VenueRentalStatsTiles } from './dashboard/VenueRentalStats';
export { default as MarkRentalDialog } from './bookings/MarkRentalDialog';
export { default as RentalRefundDialog } from './bookings/RentalRefundDialog';
export { buildRentalBookingColumns, getRentalBookingRowId, type RentalColumnOptions } from './bookings/rental-booking-columns';
export type { VenueRentalProps } from './types';
export type { MarkRentalInput } from './documents';
