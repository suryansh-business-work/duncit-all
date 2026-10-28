import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import type { LiteEventCard } from '../../../shared/graphql/documents';
import { LITE_MY_EVENTS } from '../../graphql/events';

export interface MyEvent {
  event: LiteEventCard;
  /** Hosting wins when the reader both hosts and holds a ticket. */
  role: 'HOSTING' | 'ATTENDING';
}

/** Hosted and attended events in one timeline: one row per event, soonest first (latest first for the past). */
export function mergeMyEvents(hosting: readonly LiteEventCard[], attending: readonly LiteEventCard[], past: boolean): MyEvent[] {
  const byId = new Map<string, MyEvent>();
  for (const event of attending) byId.set(event.id, { event, role: 'ATTENDING' });
  for (const event of hosting) byId.set(event.id, { event, role: 'HOSTING' });
  const direction = past ? -1 : 1;
  return [...byId.values()].sort((a, b) => direction * (Date.parse(a.event.start_at) - Date.parse(b.event.start_at)));
}

export interface MyEventsState {
  rows: MyEvent[];
  loading: boolean;
  /** The first read that failed, as QueryGuard shows it. */
  error: Error | undefined;
}

/** The reader's events for one period, hosting and attending read side by side. */
export function useMyEvents(past: boolean): MyEventsState {
  const hosting = useQuery(LITE_MY_EVENTS, { variables: { scope: 'HOSTING', past }, fetchPolicy: 'cache-and-network' });
  const attending = useQuery(LITE_MY_EVENTS, { variables: { scope: 'ATTENDING', past }, fetchPolicy: 'cache-and-network' });
  const rows = useMemo(
    () => mergeMyEvents(hosting.data?.liteMyEvents ?? [], attending.data?.liteMyEvents ?? [], past),
    [hosting.data, attending.data, past],
  );
  return {
    rows,
    loading: (hosting.loading && !hosting.data) || (attending.loading && !attending.data),
    error: hosting.error ?? attending.error,
  };
}
