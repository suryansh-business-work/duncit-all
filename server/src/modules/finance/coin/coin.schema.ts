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

  "One calendar month of coin flow. The client formats the label from the key."
  type CoinMonthBucket {
    "Calendar month as a 'YYYY-MM' key, in UTC."
    month: String!
    earned: Float!
    redeemed: Float!
  }

  "Platform-wide Duncit Coin position for Admin > Duncit Coin > Dashboard."
  type CoinAdminStats {
    "Every coin ever granted — the sum of all CREDIT rows."
    total_circulated: Float!
    "Every coin ever spent at checkout — the sum of all DEBIT rows."
    total_redeemed: Float!
    "Circulated minus redeemed: the coins still sitting with users."
    total_outstanding: Float!
    """
    The same outstanding figure read from CoinBalance instead of the ledger.
    Exposed as a cross-check: it should equal total_outstanding, and a drift is
    worth seeing rather than hiding.
    """
    wallet_balance_total: Float!
    "Ledger rows written so far."
    transaction_count: Int!
    "Accounts holding a non-zero balance."
    holders_count: Int!
    "Percent of a payment currently granted back as coins (Admin > Pod Settings)."
    earn_pct: Float!
    "Currency the coin value is quoted in — 1 coin = 1 unit of it."
    currency_symbol: String!
    "Oldest first, one entry per calendar month, empty months filled with zeroes."
    monthly: [CoinMonthBucket!]!
  }

  "A pod a coin row is attributable to, named for the admin ledger."
  type CoinAdminPod {
    id: ID!
    title: String!
    "Per-club pod slug, so two pods sharing a title stay distinguishable."
    slug: String!
  }

  "One coin ledger row joined to its payment and the pods that payment bought."
  type CoinAdminTransaction {
    id: ID!
    user_id: ID!
    "Buyer name frozen on the payment. Empty when the row has no payment."
    user_name: String!
    user_email: String!
    "CREDIT or DEBIT."
    type: String!
    amount: Float!
    balance_after: Float!
    "PAYMENT_EARN or PAYMENT_REDEEM."
    source: String!
    reason: String!
    payment_id: String
    "What the payment charged, so the row audits on its own."
    payment_total: Float!
    """
    Every pod the payment touched. A pod ticket resolves to exactly one; a shop
    cart can span several, because a unified cart groups its lines by pod. Empty
    when the payment bought nothing pod-linked.
    """
    pods: [CoinAdminPod!]!
    "Rate in effect when these coins were granted."
    earn_pct: Float!
    "Order total the grant was computed from."
    spend_amount: Float!
    created_at: String!
  }

  "Server-side table page for the shared table engine (coinTransactionsTable)."
  type CoinAdminTransactionTablePage {
    rows: [CoinAdminTransaction!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    myCoinBalance: CoinBalance!
    myCoinTransactions: [CoinTransaction!]!
    "Admin > Duncit Coin > Dashboard. 'months' bounds the distribution series (default 12, max 36)."
    coinAdminStats(months: Int): CoinAdminStats!
    "Admin > Duncit Coin > Transactions. 'pod_doc_id' scopes the page to coins settled by that pod's payments."
    coinTransactionsTable(query: TableQueryInput, pod_doc_id: ID): CoinAdminTransactionTablePage!
  }
`;
