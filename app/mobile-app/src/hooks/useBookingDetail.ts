import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { BookingDetailDocument } from '@/graphql/booking';
import { graphqlRequest } from '@/services/graphql.client';

export type BookingDetail = ResultOf<typeof BookingDetailDocument>['bookingDetail'];

/** Loads the booking behind a deep link. Ownership is enforced server-side, so
 * a booking that belongs to someone else surfaces here as an error. */
export function useBookingDetail(bookingId: string) {
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    graphqlRequest(BookingDetailDocument, { booking_id: bookingId }, { auth: true })
      .then((d) => {
        if (active) setBooking(d.bookingDetail);
      })
      .catch((e) => {
        if (active) setError(e);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bookingId]);

  return { booking, isLoading, error };
}
