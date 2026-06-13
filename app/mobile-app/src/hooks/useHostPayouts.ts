import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { MyHostPayoutsDocument } from '@/graphql/settlement';
import { graphqlRequest } from '@/services/graphql.client';

type Data = ResultOf<typeof MyHostPayoutsDocument>;
export type HostPayout = Data['myHostPayouts'][number];

/** The signed-in host's completion payouts + currency, for the Host Share list. */
export function useHostPayouts() {
  const [payouts, setPayouts] = useState<HostPayout[]>([]);
  const [symbol, setSymbol] = useState('₹');
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await graphqlRequest(MyHostPayoutsDocument, {}, { auth: true });
    setPayouts(res.myHostPayouts);
    setSymbol(res.publicFinanceSettings.currency_symbol);
  }, []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    load()
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [load]);

  return { payouts, symbol, isLoading, refetch: load };
}
