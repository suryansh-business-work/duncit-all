import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { MobileAccountHealthDocument } from '@/graphql/account';
import { MobileVenueHealthDocument } from '@/graphql/health';
import { graphqlRequest } from '@/services/graphql.client';

export type AccountHealthScore = ResultOf<typeof MobileAccountHealthDocument>['myAccountHealth'];
export type VenueHealthScore = NonNullable<
  ResultOf<typeof MobileVenueHealthDocument>['myVenueHealth']
>;

/** Account health detail — RN port of mWeb's AccountHealthPage data layer. */
export function useAccountHealth() {
  const [health, setHealth] = useState<AccountHealthScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let active = true;
    graphqlRequest(MobileAccountHealthDocument, undefined, { auth: true })
      .then((data) => active && setHealth(data.myAccountHealth ?? null))
      .catch((err) => active && setError(err))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { health, isLoading, error };
}

/** Venue health detail for an owned venue — RN port of mWeb's VenueHealthPage. */
export function useVenueHealth(venueId: string) {
  const [health, setHealth] = useState<VenueHealthScore | null>(null);
  const [isLoading, setIsLoading] = useState(!!venueId);
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    if (!venueId) {
      setIsLoading(false);
      return;
    }
    let active = true;
    graphqlRequest(MobileVenueHealthDocument, { venue_id: venueId }, { auth: true })
      .then((data) => active && setHealth(data.myVenueHealth ?? null))
      .catch((err) => active && setError(err))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [venueId]);

  return { health, isLoading, error };
}
