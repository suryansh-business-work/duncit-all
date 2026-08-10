import { useCallback, useEffect, useState } from 'react';

import { ClubStudioPodsDocument, VenueStudioPodsDocument } from '@/graphql/studio-pods';
import { graphqlRequest } from '@/services/graphql.client';
import {
  EMPTY_STUDIO_FIGURES,
  summariseStudioPods,
  type StudioPod,
  type StudioPodFiguresData,
} from './studio-pods';

export interface StudioPodsState {
  pods: StudioPod[];
  figures: StudioPodFiguresData;
  isLoading: boolean;
  /** A failed load — the section shows its error state and a retry. */
  hasError: boolean;
  refetch: () => void;
}

interface StudioPodsPayload {
  pods: StudioPod[];
  figures: StudioPodFiguresData;
}

/** Venue Studio: the pods booked at every venue the caller owns. The venue side
 * has no summary query, so the figures are derived from the list with exactly
 * the rules the server applies to the club summary. */
async function fetchVenueStudioPods(): Promise<StudioPodsPayload> {
  const data = await graphqlRequest(VenueStudioPodsDocument, undefined, { auth: true });
  const pods = data.venuePods;
  const venues = new Set(pods.map((pod) => pod.venue_id));
  return { pods, figures: summariseStudioPods(pods, venues.size) };
}

/** Club Studio: the pods across every club the caller administers. The roll-up
 * comes from the server, which counts pods beyond the list's 500-row cap and
 * owns the one figure a pod row cannot carry — collected revenue. */
async function fetchClubStudioPods(): Promise<StudioPodsPayload> {
  const data = await graphqlRequest(ClubStudioPodsDocument, undefined, { auth: true });
  const summary = data.myClubPodsSummary;
  return {
    pods: data.myClubPods,
    figures: {
      scope: summary.clubs,
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
    },
  };
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

/** "Pods hosted on your Venue" — Venue Studio. */
export function useVenueStudioPods(): StudioPodsState {
  return useStudioPodsSource(fetchVenueStudioPods);
}

/** "Your Pods" — Club Studio. */
export function useClubStudioPods(): StudioPodsState {
  return useStudioPodsSource(fetchClubStudioPods);
}
