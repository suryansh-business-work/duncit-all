import { gql } from '@apollo/client';

/** Balance + the live earn rate. Kept separate from the ledger so the sidebar
 * card can read just the balance without pulling the whole history. */
export const MY_COIN_BALANCE = gql`
  query MyCoinBalance {
    myCoinBalance {
      balance
      lifetime_earned
      earn_pct
    }
  }
`;

export const MY_COIN_TRANSACTIONS = gql`
  query MyCoinTransactions {
    myCoinBalance {
      balance
      lifetime_earned
      earn_pct
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
`;

export interface CoinTransaction {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  source: string;
  reason: string;
  spend_amount: number;
  earn_pct: number;
  created_at: string;
}

export interface CoinBalance {
  balance: number;
  lifetime_earned: number;
  earn_pct: number;
}
