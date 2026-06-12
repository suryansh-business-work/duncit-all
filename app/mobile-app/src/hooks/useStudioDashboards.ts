import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

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

/** Venue studio dashboard — my venues + booked-pod dates at the first venue. */
export function useVenueDashboard() {
  const [venues, setVenues] = useState<DashboardVenue[]>([]);
  const [podDates, setPodDates] = useState<(string | null)[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await graphqlRequest(VenueDashboardDocument, undefined, { auth: true });
      if (!active) return;
      setVenues(data.myVenues);
      const first = data.myVenues[0];
      if (first) {
        const pods = await graphqlRequest(
          VenuePodsDocument,
          { venue_id: first.id },
          { auth: true },
        ).catch(() => null);
        if (active) setPodDates(pods ? pods.pods.map((pod) => pod.pod_date_time) : []);
      }
    })()
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { venues, podDates, isLoading };
}

/** ecomm studio dashboard — the product catalogue with stock + price. */
export function useEcommDashboard() {
  const [products, setProducts] = useState<DashboardProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    graphqlRequest(EcommDashboardDocument, undefined, { auth: true })
      .then((data) => active && setProducts(data.availablePodProducts))
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { products, isLoading };
}
