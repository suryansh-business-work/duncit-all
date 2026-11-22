import { useState } from 'react';
import type { ApolloCache } from '@apollo/client';
import { parseApiError, type RentalBookingDetail } from '@duncit/utils';
import { RENTAL_BOOKING_DETAIL } from '../../documents';

/**
 * Puts a mutation's fresh detail where the open drawer reads it, so the
 * drawer shows the server's answer without a second round trip.
 */
export function writeRentalDetail(cache: ApolloCache, detail: RentalBookingDetail | undefined) {
  if (!detail) return;
  cache.writeQuery({ query: RENTAL_BOOKING_DETAIL, variables: { id: detail.booking.id }, data: { rentalBookingDetail: detail } });
}

/**
 * The server's refusal of a detail mutation, shown in the dialog's Alert. The
 * message is the server's own (parseApiError), never a raw stack.
 */
export function useApiError() {
  const [apiError, setApiError] = useState<string | null>(null);
  return {
    apiError,
    clear: () => setApiError(null),
    fail: (error: unknown) => setApiError(parseApiError(error)),
  };
}
