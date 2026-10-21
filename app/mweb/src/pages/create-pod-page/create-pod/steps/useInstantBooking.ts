import { useCallback, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  bookingCalendarRange,
  bookingClosedTiles,
  bookingDayOf,
  bookingEndOptions,
  bookingSpaceLabel,
  bookingTiles,
} from '@duncit/utils';
import { useDateFormat } from '../../../../utils/dateFormat';
import { VENUE_BOOKING_CALENDAR, VENUE_BOOKING_PRICING } from '../venueBooking';

/**
 * Step 3's instant booking: the venue's pricing gate and limits, then its
 * calendar for the next 62 days (the server's cap per read) for the picked
 * space, turned into what the host may pick. Every rule is the server's;
 * the shared helpers only lay its answers out. Native twin: useInstantBooking.
 */
export function useInstantBooking(venueId: string, spaceLabel: string) {
  const fmt = useDateFormat();
  const pricingQuery = useQuery(VENUE_BOOKING_PRICING, {
    variables: { venue_id: venueId },
    skip: !venueId,
    fetchPolicy: 'cache-and-network',
  });
  const pricing = pricingQuery.data?.venuePricing ?? null;
  const configured = Boolean(pricing?.configured && pricing.model);
  const range = useMemo(() => bookingCalendarRange(fmt.dayKey(fmt.clock.nowMs())), [fmt]);
  const calendarQuery = useQuery(VENUE_BOOKING_CALENDAR, {
    variables: { venue_id: venueId, ...range, space_label: bookingSpaceLabel(spaceLabel) },
    skip: !venueId || !spaceLabel || !configured,
    fetchPolicy: 'cache-and-network',
  });
  const calendar = calendarQuery.data?.venueBookingCalendar;
  const days = calendar?.days;
  // The venue's buffer and minimum notice come with the calendar.
  const rules = useMemo(
    () =>
      pricing && calendar
        ? { ...pricing, buffer_minutes: calendar.buffer_minutes, min_notice_minutes: calendar.min_notice_minutes }
        : null,
    [pricing, calendar]
  );
  // What the host can pick, then the days the venue closed itself, labelled.
  const tiles = useMemo(
    () =>
      rules && days
        ? [...bookingTiles(days, rules, fmt.timeZone, fmt.clock.nowMs()), ...bookingClosedTiles(days, fmt.timeZone)]
        : [],
    [rules, days, fmt]
  );
  /** The end times a start allows (empty when its day is not loaded). */
  const endsFor = useCallback(
    (startIso: string | null): string[] => {
      const day = rules && days && startIso ? bookingDayOf(days, startIso, fmt.timeZone) : null;
      return rules && day && startIso ? bookingEndOptions(day, rules, startIso, fmt.timeZone) : [];
    },
    [rules, days, fmt]
  );

  return {
    pricing,
    configured,
    pricingLoading: pricingQuery.loading && !pricingQuery.data,
    pricingError: pricingQuery.error ?? null,
    calendarLoading: calendarQuery.loading && !calendarQuery.data,
    calendarError: calendarQuery.error ?? null,
    tiles,
    endsFor,
  };
}
