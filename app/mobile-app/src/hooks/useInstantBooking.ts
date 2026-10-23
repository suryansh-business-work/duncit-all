import { useCallback, useEffect, useMemo, useState } from 'react';
import { logs } from '@duncit/logs';
import {
  bookingCalendarRange,
  bookingClosedTiles,
  bookingDayOf,
  bookingEndOptions,
  bookingSpaceLabel,
  bookingTiles,
  type BookingCalendarDay,
} from '@duncit/utils';

import { HostBookingCalendarDocument } from '@/graphql/venue-booking';
import { useDateFormat } from '@/hooks/useDateFormat';
import { graphqlRequest } from '@/services/graphql.client';
import { useRefreshRegistration } from '@/components/PullToRefresh';
import { loadVenueBookingPricing } from './venueBookingPricing';

export type { VenueBookingPricing } from './venueBookingPricing';

/** The calendar read: the venue's buffer and notice, and its days. */
interface CalendarAnswer {
  buffer_minutes: number;
  min_notice_minutes: number;
  days: BookingCalendarDay[];
}

interface Loaded<T> {
  data: T | null;
  loading: boolean;
  failed: boolean;
}

const IDLE = { data: null, loading: false, failed: false };

/** One server read that re-runs when its key changes (or on pull-to-refresh). */
function useLoad<T>(key: string, load: () => Promise<T>, attempt: number, what: string): Loaded<T> {
  const [state, setState] = useState<Loaded<T>>(IDLE);
  useEffect(() => {
    if (!key) {
      setState(IDLE);
      return undefined;
    }
    let active = true;
    setState({ data: null, loading: true, failed: false });
    load()
      .then((data) => active && setState({ data, loading: false, failed: false }))
      .catch((error: unknown) => {
        if (!active) return;
        setState({ data: null, loading: false, failed: true });
        logs.mobileApp.warn('useInstantBooking', what, { error });
      });
    return () => {
      active = false;
    };
    // `load` is rebuilt every render; the key is what it reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);
  return state;
}

/**
 * Step 3's instant booking: the venue's pricing gate and limits, then its
 * calendar for the next 62 days (the server's cap per read) for the picked
 * space, turned into what the host may pick. Every rule is the server's; the
 * shared helpers only lay its answers out. mWeb twin: steps/useInstantBooking.
 */
export function useInstantBooking(venueId: string, spaceLabel: string) {
  const fmt = useDateFormat();
  const [attempt, setAttempt] = useState(0);
  const refetch = useCallback(() => setAttempt((value) => value + 1), []);
  useRefreshRegistration(refetch);

  const pricingState = useLoad(
    venueId,
    () => loadVenueBookingPricing(venueId, attempt > 0),
    attempt,
    'pricing',
  );
  const pricing = pricingState.data;
  const configured = Boolean(pricing?.configured && pricing.model);
  const range = useMemo(() => bookingCalendarRange(fmt.dayKey(fmt.clock.nowMs())), [fmt]);
  const space = bookingSpaceLabel(spaceLabel);
  const calendarState = useLoad<CalendarAnswer>(
    configured && spaceLabel ? `${venueId}|${space}|${range.from}` : '',
    () =>
      graphqlRequest(
        HostBookingCalendarDocument,
        { venue_id: venueId, ...range, space_label: space },
        { auth: true },
      ).then((res) => res.venueBookingCalendar),
    attempt,
    'calendar',
  );
  const calendar = calendarState.data;
  const days = calendar?.days;
  // The venue's buffer and minimum notice come with the calendar.
  const rules = useMemo(
    () =>
      pricing && calendar
        ? {
            ...pricing,
            buffer_minutes: calendar.buffer_minutes,
            min_notice_minutes: calendar.min_notice_minutes,
          }
        : null,
    [pricing, calendar],
  );
  // What the host can pick, then the days the venue closed itself, labelled.
  const tiles = useMemo(
    () =>
      rules && days
        ? [
            ...bookingTiles(days, rules, fmt.timeZone, fmt.clock.nowMs()),
            ...bookingClosedTiles(days, fmt.timeZone),
          ]
        : [],
    [rules, days, fmt],
  );
  /** The end times a start allows (empty when its day is not loaded). */
  const endsFor = useCallback(
    (startIso: string | null): string[] => {
      const day = rules && days && startIso ? bookingDayOf(days, startIso, fmt.timeZone) : null;
      return rules && day && startIso ? bookingEndOptions(day, rules, startIso, fmt.timeZone) : [];
    },
    [rules, days, fmt],
  );

  return {
    pricing,
    configured,
    pricingLoading: pricingState.loading,
    pricingFailed: pricingState.failed,
    calendarLoading: calendarState.loading,
    calendarFailed: calendarState.failed,
    tiles,
    endsFor,
  };
}
