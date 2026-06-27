import { useCallback, useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { MobileAccountHealthDocument } from '@/graphql/account';
import { MobileVenueHealthDocument } from '@/graphql/health';
import { graphqlRequest } from '@/services/graphql.client';

export type AccountHealthScore = ResultOf<typeof MobileAccountHealthDocument>['myAccountHealth'];
export type VenueHealthScore = NonNullable<
  ResultOf<typeof MobileVenueHealthDocument>['myVenueHealth']
>;

/** Account health detail — RN port of mWeb's AccountHealthPage data layer. Refetches
 * on focus so admin edits/deletes (B24) reflect without an app restart. */
export function useAccountHealth() {
  const navigation = useNavigation();
  const [health, setHealth] = useState<AccountHealthScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  const load = useCallback(
    () =>
      graphqlRequest(MobileAccountHealthDocument, undefined, { auth: true })
        .then((data) => setHealth(data.myAccountHealth ?? null))
        .catch((err) => setError(err))
        .finally(() => setIsLoading(false)),
    [],
  );

  useEffect(() => {
    void load();
    const unsubscribe = navigation.addListener('focus', () => void load());
    return unsubscribe;
  }, [navigation, load]);

  return { health, isLoading, error };
}

/** Venue health detail for an owned venue — RN port of mWeb's VenueHealthPage.
 * Refetches on focus so admin edits/deletes (B24) reflect immediately. */
export function useVenueHealth(venueId: string) {
  const navigation = useNavigation();
  const [health, setHealth] = useState<VenueHealthScore | null>(null);
  const [isLoading, setIsLoading] = useState(!!venueId);
  const [error, setError] = useState<unknown>();

  const load = useCallback(() => {
    if (!venueId) {
      setIsLoading(false);
      return Promise.resolve();
    }
    return graphqlRequest(MobileVenueHealthDocument, { venue_id: venueId }, { auth: true })
      .then((data) => setHealth(data.myVenueHealth ?? null))
      .catch((err) => setError(err))
      .finally(() => setIsLoading(false));
  }, [venueId]);

  useEffect(() => {
    void load();
    const unsubscribe = navigation.addListener('focus', () => void load());
    return unsubscribe;
  }, [navigation, load]);

  return { health, isLoading, error };
}
