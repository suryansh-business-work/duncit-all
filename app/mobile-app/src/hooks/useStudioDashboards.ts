import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { pickVenue } from '@duncit/utils';

import {
  EcommDashboardDocument,
  VenueDashboardDocument,
  VenuePodsDocument,
} from '@/graphql/studio-dashboard';
import { graphqlRequest } from '@/services/graphql.client';

export type DashboardVenue = ResultOf<typeof VenueDashboardDocument>['myVenues'][number];
export type DashboardProduct = ResultOf<
  typeof EcommDashboardDocument
>['availablePodProducts'][number];

/**
 * Venue studio dashboard — every venue the partner owns, plus the booked-pod
 * dates at the ONE the switcher has selected.
 *
 * The selection lives here rather than in the screen because the pod-dates
 * fetch hangs off it: a switch has to re-ask for the chart's bookings, and
 * `pickVenue` (shared with mWeb) decides which venue that is before the user
 * has touched anything.
 */
export function useVenueDashboard() {
  const [venues, setVenues] = useState<DashboardVenue[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [podDates, setPodDates] = useState<(string | null)[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    graphqlRequest(VenueDashboardDocument, undefined, { auth: true })
      .then((data) => active && setVenues(data.myVenues))
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const venue = pickVenue(venues, selectedId);
  const venueId = venue?.id ?? null;

  useEffect(() => {
    if (!venueId) return undefined;
    let active = true;
    graphqlRequest(VenuePodsDocument, { venue_id: venueId }, { auth: true })
      .then((res) => active && setPodDates(res.pods.map((pod) => pod.pod_date_time)))
      .catch(() => active && setPodDates([]));
    return () => {
      active = false;
    };
  }, [venueId]);

  return { venues, venue, venueId, selectVenue: setSelectedId, podDates, isLoading };
}

/** ecomm studio dashboard — the product catalogue with stock + price. The
 * `enabled` flag lets a caller skip the fetch when products are gated off. */
export function useEcommDashboard(enabled = true) {
  const [products, setProducts] = useState<DashboardProduct[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    graphqlRequest(EcommDashboardDocument, undefined, { auth: true })
      .then((data) => active && setProducts(data.availablePodProducts))
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [enabled]);

  return { products, isLoading };
}
