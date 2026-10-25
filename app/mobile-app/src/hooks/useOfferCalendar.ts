import { useCallback, useEffect, useMemo, useState } from 'react';
import { logs } from '@duncit/logs';
import {
  bookingCalendarRange,
  bookingSpaceLabel,
  offerCalendarPicks,
  type OfferCalendar,
} from '@duncit/utils';

import { VenueOfferCalendarDocument } from '@/graphql/venue-offer';
import { useDateFormat } from '@/hooks/useDateFormat';
import { graphqlRequest } from '@/services/graphql.client';
import { useRefreshRegistration } from '@/components/PullToRefresh';

interface CalendarState {
  calendar: OfferCalendar | null;
  loading: boolean;
  failed: boolean;
}

const IDLE: CalendarState = { calendar: null, loading: false, failed: false };

/**
 * Step 3's venue calendar for an offer: the next 62 days (the server's cap per
 * read) for the picked space — the days the venue is open, its opening hours
 * and what is already booked — turned into the start times the host may pick
 * and, for a start, its end times (`offerCalendarPicks`, shared with mWeb).
 * Re-read on pull-to-refresh. mWeb twin: steps/useOfferCalendar.
 */
export function useOfferCalendar(venueId: string, spaceLabel: string) {
  const fmt = useDateFormat();
  const [attempt, setAttempt] = useState(0);
  const refetch = useCallback(() => setAttempt((value) => value + 1), []);
  useRefreshRegistration(refetch);
  const [state, setState] = useState<CalendarState>(IDLE);
  // Keyed on the day, not `fmt`: the formatter is rebuilt on every render, and
  // a new range each render would re-run the read below forever.
  const today = fmt.dayKey(fmt.clock.nowMs());
  const range = useMemo(() => bookingCalendarRange(today), [today]);
  const space = bookingSpaceLabel(spaceLabel);

  useEffect(() => {
    if (!venueId || !spaceLabel) {
      setState(IDLE);
      return undefined;
    }
    let active = true;
    setState({ calendar: null, loading: true, failed: false });
    graphqlRequest(
      VenueOfferCalendarDocument,
      { venue_id: venueId, ...range, space_label: space },
      { auth: true },
    )
      .then(
        (res) =>
          active && setState({ calendar: res.venueOfferCalendar, loading: false, failed: false }),
      )
      .catch((error: unknown) => {
        if (!active) return;
        setState({ calendar: null, loading: false, failed: true });
        logs.mobileApp.warn('useOfferCalendar', 'calendar', { error, venue_id: venueId });
      });
    return () => {
      active = false;
    };
  }, [venueId, spaceLabel, space, range, attempt]);

  const picks = useMemo(
    () => offerCalendarPicks(state.calendar, fmt.timeZone, fmt.clock.nowMs()),
    [state.calendar, fmt],
  );
  return { loading: state.loading, failed: state.failed, ...picks };
}
