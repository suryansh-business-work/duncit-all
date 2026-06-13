import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { MyWalletDocument } from '@/graphql/wallet';
import { graphqlRequest } from '@/services/graphql.client';

type Data = ResultOf<typeof MyWalletDocument>;
export type WalletInfo = Data['myWallet'];
export type WalletTxn = Data['myWalletTransactions'][number];
export type Withdrawal = Data['myWithdrawals'][number];

/** The signed-in host's wallet: balance, payout cycle, transactions + withdrawals. */
export function useWallet() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<WalletTxn[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await graphqlRequest(MyWalletDocument, {}, { auth: true });
    setWallet(res.myWallet);
    setTransactions(res.myWalletTransactions);
    setWithdrawals(res.myWithdrawals);
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

  return { wallet, transactions, withdrawals, isLoading, refetch: load };
}
