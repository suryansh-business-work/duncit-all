import { useCallback, useEffect, useMemo, useState } from 'react';
import { logs } from '@duncit/logs';
import { venueHostTermsById, type VenueHostTerms } from '@duncit/utils';

import { MobileVenueHostTermsDocument } from '@/graphql/hosts-venues';
import { graphqlRequest } from '@/services/graphql.client';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Fees & Minimum Spend of the listed venues, for a host weighing them. The
 * server answers only for an active host, so for anyone else the map stays
 * empty and the screens show what they always did; a signed-out visitor is
 * never asked. mWeb twin: hooks/useVenueHostTerms.
 */
export function useVenueHostTerms(venueIds: readonly string[]) {
  const signedIn = useAuthStore((s) => !!s.token);
  // One stable key for the ids, so a re-render with the same list asks nothing.
  const key = useMemo(() => [...new Set(venueIds)].sort().join(','), [venueIds]);
  const [rows, setRows] = useState<VenueHostTerms[]>([]);
  const [error, setError] = useState<unknown>();
  const [attempt, setAttempt] = useState(0);
  const refetch = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!signedIn || !key) {
      setRows([]);
      setError(undefined);
      return;
    }
    let active = true;
    graphqlRequest(MobileVenueHostTermsDocument, { venue_ids: key.split(',') }, { auth: true })
      .then((data) => {
        if (!active) return;
        setRows(data.venueHostTerms);
        setError(undefined);
      })
      .catch((err: unknown) => {
        logs.mobileApp.warn('useVenueHostTerms', 'load', { error: err });
        if (active) setError(err);
      });
    return () => {
      active = false;
    };
  }, [signedIn, key, attempt]);

  const byId = useMemo(() => venueHostTermsById(rows), [rows]);
  return { byId, error, refetch };
}
