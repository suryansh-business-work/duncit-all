import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { bookingCalendarRange, bookingSpaceLabel, offerCalendarPicks } from '@duncit/utils';
import { useDateFormat } from '../../../../utils/dateFormat';
import { VENUE_OFFER_CALENDAR } from '../venueOffer';

/**
 * Step 3's venue calendar for an offer: the next 62 days (the server's cap per
 * read) for the picked space — the days the venue is open, its opening hours
 * and what is already booked — turned into the start times the host may pick
 * and, for a start, its end times (`offerCalendarPicks`, shared with native).
 * Every rule is the server's. Native twin: useOfferCalendar.
 */
export function useOfferCalendar(venueId: string, spaceLabel: string) {
  const fmt = useDateFormat();
  const range = useMemo(() => bookingCalendarRange(fmt.dayKey(fmt.clock.nowMs())), [fmt]);
  const calendarQuery = useQuery(VENUE_OFFER_CALENDAR, {
    variables: { venue_id: venueId, ...range, space_label: bookingSpaceLabel(spaceLabel) },
    skip: !venueId || !spaceLabel,
    fetchPolicy: 'cache-and-network',
  });
  const calendar = calendarQuery.data?.venueOfferCalendar;
  const picks = useMemo(() => offerCalendarPicks(calendar, fmt.timeZone, fmt.clock.nowMs()), [calendar, fmt]);

  return {
    loading: calendarQuery.loading && !calendarQuery.data,
    error: calendarQuery.error ?? null,
    ...picks,
  };
}
