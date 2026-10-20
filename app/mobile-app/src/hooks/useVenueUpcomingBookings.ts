import { useCallback, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { VenueUpcomingBookingsDocument } from '@/graphql/venue-pricing';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';

export type UpcomingBooking = ResultOf<
  typeof VenueUpcomingBookingsDocument
>['myVenueUpcomingBookings'][number];

/** How many bookings the dashboard card lists. */
const DASHBOARD_LIMIT = 5;

/** The selected venue's confirmed instant bookings, soonest first. */
export function useVenueUpcomingBookings(venueId: string | null, limit = DASHBOARD_LIMIT) {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<UpcomingBooking[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!venueId) return;
    const data = await graphqlRequest(
      VenueUpcomingBookingsDocument,
      { venue_id: venueId, limit },
      { auth: true },
    );
    setBookings(data.myVenueUpcomingBookings);
    setError(null);
  }, [venueId, limit]);

  const { isLoading } = useReloadableQuery(load, {
    enabled: !!venueId,
    onError: (e) => setError(toErrorMessage(e, t('availability.upcomingBookings.loadFailed'))),
  });

  return { bookings, isLoading: !!venueId && isLoading, error };
}
