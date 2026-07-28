import { gql } from '@/generated/graphql';

/** Resolves a booking deep link (the receipt email's "View Booking" CTA) into
 * the pod it points at. The server rejects anyone who does not own the booking,
 * so the screen never has to decide visibility itself. */
export const BookingDetailDocument = gql(`
  query MobileBookingDetail($booking_id: ID!) {
    bookingDetail(booking_id: $booking_id) {
      id
      pod_id
      club_slug
      pod_slug
      pod_title
      pod_date_time
      status
    }
  }
`);
