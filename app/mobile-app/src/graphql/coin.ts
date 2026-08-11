import { gql } from '@/generated/graphql';

/** Balance + the live earn rate — mWeb's MY_COIN_BALANCE. Kept separate from the
 * ledger so the sidebar card reads just the balance without the whole history. */
export const MobileMyCoinBalanceDocument = gql(`
  query MobileMyCoinBalance {
    myCoinBalance {
      balance
      lifetime_earned
      earn_pct
      shop_earn_pct
    }
  }
`);

/** Balance + the full coin ledger — mWeb's MY_COIN_TRANSACTIONS. */
export const MobileMyCoinTransactionsDocument = gql(`
  query MobileMyCoinTransactions {
    myCoinBalance {
      balance
      lifetime_earned
      earn_pct
      shop_earn_pct
    }
    myCoinTransactions {
      id
      type
      amount
      balance_after
      source
      reason
      spend_amount
      earn_pct
      created_at
    }
  }
`);
