import { gql } from '@apollo/client';

/** Resolves a booking deep link (the receipt email's "View Booking" CTA) into
 * the pod it points at. The server enforces that only the booking's owner may
 * read it — the client never decides visibility. */
export const BOOKING_DETAIL = gql`
  query BookingDetail($booking_id: ID!) {
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
`;

export interface BookingDetail {
  id: string;
  pod_id: string;
  club_slug: string;
  pod_slug: string;
  pod_title: string;
  pod_date_time?: string | null;
  status: string;
}
