import { useCallback, useEffect, useState } from 'react';

import { ClubStudioPodsDocument, VenueStudioPodsDocument } from '@/graphql/studio-pods';
import { graphqlRequest } from '@/services/graphql.client';
import {
  EMPTY_STUDIO_FIGURES,
  type StudioPod,
  type StudioPodFiguresData,
  type StudioPodSummaryResult,
} from './studio-pods';

export interface StudioPodsState {
  pods: StudioPod[];
  figures: StudioPodFiguresData;
  isLoading: boolean;
  /** A failed load — the section shows its error state and a retry. */
  hasError: boolean;
  refetch: () => void;
}

/** The server summary as the strip reads it. Both studios return the same
 * shape, so there is one mapper and no per-studio arithmetic. */
function toFigures(summary: StudioPodSummaryResult): StudioPodFiguresData {
  return {
    scope: summary.scope_count,
    total: summary.total,
    upcoming: summary.upcoming,
    ongoing: summary.ongoing,
    completed: summary.completed,
    cancelled: summary.cancelled,
    total_spots: summary.total_spots,
    filled_spots: summary.filled_spots,
    total_attendees: summary.total_attendees,
    fill_rate: summary.fill_rate,
    next_pod_date_time: summary.next_pod_date_time ?? null,
    total_revenue: summary.total_revenue,
    currency_symbol: summary.currency_symbol,
  };
}

interface StudioPodsPayload {
  pods: StudioPod[];
  figures: StudioPodFiguresData;
}

/** Venue Studio: the pods booked at the venue the switcher has picked — or at
 * every venue the caller owns when nothing is picked. The figures come from the
 * server, computed over EVERY approved booking while the list is capped — the
 * client used to fold the capped list and report a total of 500 for a busy
 * venue. */
async function fetchVenueStudioPods(venueId: string | null): Promise<StudioPodsPayload> {
  const data = await graphqlRequest(VenueStudioPodsDocument, { venue_id: venueId }, { auth: true });
  return { pods: data.venuePods, figures: toFigures(data.venuePodsSummary) };
}

/** Club Studio: the pods across every club the caller administers. The roll-up
 * comes from the server, which counts pods beyond the list's 500-row cap and
 * owns the one figure a pod row cannot carry — collected revenue. */
async function fetchClubStudioPods(): Promise<StudioPodsPayload> {
  const data = await graphqlRequest(ClubStudioPodsDocument, undefined, { auth: true });
  return { pods: data.myClubPods, figures: toFigures(data.myClubPodsSummary) };
}

/** Shared load/retry state machine for both studios — one fetch, one error flag,
 * one refetch, so the two sections behave identically. */
function useStudioPodsSource(fetcher: () => Promise<StudioPodsPayload>): StudioPodsState {
  const [payload, setPayload] = useState<StudioPodsPayload>({
    pods: [],
    figures: EMPTY_STUDIO_FIGURES,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const refetch = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setHasError(false);
    fetcher()
      .then((next) => {
        if (active) setPayload(next);
      })
      .catch(() => {
        if (active) setHasError(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetcher, attempt]);

  return { ...payload, isLoading, hasError, refetch };
}

/** "Pods hosted on your Venue" — Venue Studio. Re-fetches when the switcher
 * moves to another venue. */
export function useVenueStudioPods(venueId?: string | null): StudioPodsState {
  const fetcher = useCallback(() => fetchVenueStudioPods(venueId ?? null), [venueId]);
  return useStudioPodsSource(fetcher);
}

/** "Your Pods" — Club Studio. */
export function useClubStudioPods(): StudioPodsState {
  return useStudioPodsSource(fetchClubStudioPods);
}
