import { gql } from '@apollo/client';

/** Balance + the live earn rate. Kept separate from the ledger so the sidebar
 * card can read just the balance without pulling the whole history. */
export const MY_COIN_BALANCE = gql`
  query MyCoinBalance {
    myCoinBalance {
      balance
      lifetime_earned
      earn_pct
      shop_earn_pct
      pod_feedback_coins
    }
  }
`;

export const MY_COIN_TRANSACTIONS = gql`
  query MyCoinTransactions {
    myCoinBalance {
      balance
      lifetime_earned
      earn_pct
      shop_earn_pct
      pod_feedback_coins
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
  /** Pod-join rate. Named `earn_pct` on the server since it predates the split. */
  earn_pct: number;
  shop_earn_pct: number;
  /** Flat coins paid for rating an attended pod. 0 means the reward is off. */
  pod_feedback_coins: number;
}
