export const coinTypeDefs = /* GraphQL */ `
  "A user's Duncit Coin balance. 1 coin = 1 rupee of earned reward value."
  type CoinBalance {
    balance: Float!
    "Every coin ever earned, so the total survives future spending."
    lifetime_earned: Float!
    "Percent of a payment currently granted back as coins (Admin > Pod Settings)."
    earn_pct: Float!
  }

  "One row of the coin ledger — insert-only, newest first."
  type CoinTransaction {
    id: ID!
    type: String!
    amount: Float!
    balance_after: Float!
    source: String!
    reason: String!
    "Payment this reward was earned on."
    payment_id: String
    "Rate in effect when these coins were granted."
    earn_pct: Float!
    "Order total the grant was computed from."
    spend_amount: Float!
    created_at: String!
  }

  extend type Query {
    myCoinBalance: CoinBalance!
    myCoinTransactions: [CoinTransaction!]!
  }
`;
