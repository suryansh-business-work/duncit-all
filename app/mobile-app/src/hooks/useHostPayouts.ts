import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { MyHostPayoutsDocument } from '@/graphql/settlement';
import { graphqlRequest } from '@/services/graphql.client';

type Data = ResultOf<typeof MyHostPayoutsDocument>;
export type HostPayout = Data['myHostPayouts'][number];

/** The signed-in host's completion payouts + currency, for the Host Share list.
 *
 * A failed load surfaces through `error` — it used to be swallowed, so a
 * network blip rendered as "Complete a pod to see your share here." and a host
 * with real completed pods had no way to tell the difference. */
export function useHostPayouts() {
  const [payouts, setPayouts] = useState<HostPayout[]>([]);
  const [symbol, setSymbol] = useState('₹');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await graphqlRequest(MyHostPayoutsDocument, {}, { auth: true });
      setPayouts(res.myHostPayouts);
      setSymbol(res.publicFinanceSettings.currency_symbol);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your payouts');
    }
  }, []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    load().finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [load]);

  return { payouts, symbol, isLoading, error, refetch: load };
}
