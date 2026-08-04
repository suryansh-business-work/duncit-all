import type { ResultOf } from '@graphql-typed-document-node/core';

import { MobileMyCoinBalanceDocument, MobileMyCoinTransactionsDocument } from '@/graphql/coin';
import { graphqlRequest } from '@/services/graphql.client';
import { createQueryStore } from './create-query-store';

export type CoinBalanceData = ResultOf<typeof MobileMyCoinBalanceDocument>;
export type CoinLedgerData = ResultOf<typeof MobileMyCoinTransactionsDocument>;

export type CoinBalance = CoinBalanceData['myCoinBalance'];
export type CoinTransaction = CoinLedgerData['myCoinTransactions'][number];

/** Coin balance alone — backs the sidebar card. */
export const useCoinBalanceStore = createQueryStore<CoinBalanceData>(() =>
  graphqlRequest(MobileMyCoinBalanceDocument, undefined, { auth: true }),
);

/** Balance + the full ledger — backs the Duncit Coin screen. */
export const useCoinLedgerStore = createQueryStore<CoinLedgerData>(() =>
  graphqlRequest(MobileMyCoinTransactionsDocument, undefined, { auth: true }),
);
