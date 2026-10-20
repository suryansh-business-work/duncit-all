import { useCallback, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { VenueBookingCalendarDocument } from '@/graphql/venue-pricing';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';

export type BookingDay = ResultOf<
  typeof VenueBookingCalendarDocument
>['venueBookingCalendar']['days'][number];

/**
 * What each day of the visible month looks like to a host — closed and why,
 * the busy (booked) windows and, for a PER_SLOT venue, every slot with its
 * server-computed price. Keyed by 'YYYY-MM-DD'. `from`..`to` must stay within
 * the server's 62-day window; one month always does.
 */
export function useVenueBookingCalendar(venueId: string | null, from: string, to: string) {
  const { t } = useTranslation();
  const [days, setDays] = useState<ReadonlyMap<string, BookingDay>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!venueId) return;
    const data = await graphqlRequest(
      VenueBookingCalendarDocument,
      { venue_id: venueId, from, to },
      { auth: true },
    );
    setDays(new Map(data.venueBookingCalendar.days.map((day) => [day.date, day])));
    setError(null);
  }, [venueId, from, to]);

  const { isLoading, refetch } = useReloadableQuery(load, {
    enabled: !!venueId,
    onError: (e) =>
      setError(toErrorMessage(e, t('availability.pricingModule.calendar.loadFailed'))),
  });

  return { days, isLoading: !!venueId && isLoading, error, refetch };
}
