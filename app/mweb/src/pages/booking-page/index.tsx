import { useQuery } from '@apollo/client';
import { Navigate, useParams } from 'react-router-dom';
import { Alert, Box, CircularProgress } from '@mui/material';
import { podUrl } from '../../utils/seoUrls';
import { parseApiError } from '../../utils/parseApiError';
import { BOOKING_DETAIL, type BookingDetail } from './queries';

/**
 * Landing page for a booking deep link — `/booking/:bookingId`, the target of
 * the payment-receipt email's "View Booking" button. It asks the server to
 * resolve the booking (which rejects anyone who does not own it) and forwards
 * to that pod's detail page. Wrapped in RequireAuth, so a signed-out visitor is
 * sent to `/login?redirect=/booking/:bookingId` and lands back here afterwards.
 * mWeb twin of the native BookingScreen (rule 27).
 */
export default function BookingPage() {
  const { bookingId = '' } = useParams<{ bookingId: string }>();
  const { data, loading, error } = useQuery<{ bookingDetail: BookingDetail }>(BOOKING_DETAIL, {
    variables: { booking_id: bookingId },
    skip: !bookingId,
    fetchPolicy: 'cache-and-network',
  });
  const booking = data?.bookingDetail;

  if (booking) {
    // podUrl falls back to '/' when either slug is empty, and club_slug /
    // pod_slug are non-null Strings that CAN be '' for a legacy slug-less pod.
    // Silently landing on the home page is the "generic landing" this deep link
    // exists to avoid, so say what went wrong instead of pretending it worked.
    const target = podUrl(booking.club_slug, booking.pod_slug);
    if (target === '/') {
      return (
        <Alert severity="warning" data-testid="booking-error">
          {/* TODO(i18n) — ships as a literal until this feature is localized. */}
          This pod is no longer available to view.
        </Alert>
      );
    }
    return <Navigate to={target} replace />;
  }
  if (error) {
    return (
      <Alert severity="error" data-testid="booking-error">
        {parseApiError(error)}
      </Alert>
    );
  }
  if (!loading) {
    return (
      <Alert severity="warning" data-testid="booking-error">
        {/* TODO(i18n) — ships as a literal until this feature is localized. */}
        This booking could not be found.
      </Alert>
    );
  }
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }} data-testid="booking-loading">
      <CircularProgress />
    </Box>
  );
}
