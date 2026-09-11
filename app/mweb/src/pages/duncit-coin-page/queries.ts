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
      expiring_coins
      next_expiry_at
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
      expires_at
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
  /** When the unspent part of this grant lapses. Null on debits and on coins that never expire. */
  expires_at: string | null;
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
  /** Coins in the soonest batch due to expire. Absent on the sidebar's slimmer query. */
  expiring_coins?: number;
  /** When that batch lapses. Null when nothing is set to expire. */
  next_expiry_at?: string | null;
}
