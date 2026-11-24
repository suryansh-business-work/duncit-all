import { useEffect, useRef } from 'react';
import { gql, type TypedDocumentNode } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useLocation } from 'react-router';
import type { EventRequestCounts, Query } from '@duncit/gql-types';
import { fireAndForget, logs } from '@duncit/logs';
import type { NavBadge } from '@duncit/shell';

const LOGGER = logs.portal['partners-app'];

/** Either field can come back null: with `errorPolicy: 'all'` one failing
 * count leaves the other standing. */
interface WaitingData {
  venueSlotRequestCount: Query['venueSlotRequestCount'] | null;
  myReceivedEventRequestCounts: Pick<EventRequestCounts, 'open'> | null;
}

/**
 * What waits on the venue owner on Workshop & Event Requests, in one request:
 * hosts' booking offers the venue has not answered, and members' requests
 * still open. Two counts, no rows.
 */
export const VENUE_REQUESTS_WAITING: TypedDocumentNode<WaitingData, Record<string, never>> = gql`
  query VenueRequestsWaiting {
    venueSlotRequestCount
    myReceivedEventRequestCounts(target_type: VENUE) {
      open
    }
  }
`;

/** New requests arrive without a socket here, so the count is re-read this often. */
export const VENUE_REQUESTS_WAITING_POLL_MS = 60_000;

/** The studio option the count belongs to: Workshop & Event Requests. */
export const REQUESTS_OPTION_KEY = 'slot-requests';

/** The badge's hover words; the shell fills in `{count}`. */
export const WAITING_BADGE_LABEL_KEY = 'shell.nav.waitingForYourAction';

/**
 * The red count beside Workshop & Event Requests in both sidebars, read only
 * while the venue studio is open (`enabled`).
 *
 * `network` is the one reader that fetches (the console's AppShell): it polls
 * for new arrivals and re-reads on every page change, so an answer just given
 * drops off at once. `cache` (the studio menu beside the page) reads what that
 * one fetched, so two sidebars never mean two requests.
 *
 * A read that fails shows no badge — the page itself still lists every
 * request — and is logged rather than lost.
 */
export function useVenueRequestsWaiting(enabled: boolean, source: 'network' | 'cache' = 'network'): NavBadge | null {
  const { pathname } = useLocation();
  const fetches = enabled && source === 'network';
  const { data, error, refetch } = useQuery(VENUE_REQUESTS_WAITING, {
    skip: !enabled,
    fetchPolicy: fetches ? 'cache-and-network' : 'cache-only',
    errorPolicy: 'all',
    pollInterval: fetches ? VENUE_REQUESTS_WAITING_POLL_MS : 0,
  });

  // The query's own first read covers the page it mounted on; later pages re-read.
  const seenPath = useRef(pathname);
  useEffect(() => {
    if (!fetches || seenPath.current === pathname) return;
    seenPath.current = pathname;
    fireAndForget(refetch(), LOGGER, 'AppShell', 'useVenueRequestsWaiting.refetch');
  }, [fetches, pathname, refetch]);

  useEffect(() => {
    if (fetches && error) LOGGER.warn('AppShell', 'useVenueRequestsWaiting', { message: error.message });
  }, [fetches, error]);

  if (!enabled || !data) return null;
  const count = (data.venueSlotRequestCount ?? 0) + (data.myReceivedEventRequestCounts?.open ?? 0);
  return count > 0 ? { count, labelKey: WAITING_BADGE_LABEL_KEY } : null;
}
