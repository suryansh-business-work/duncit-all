export const coinTypeDefs = /* GraphQL */ `
  "A user's Duncit Coin balance. 1 coin = 1 rupee of earned reward value."
  type CoinBalance {
    balance: Float!
    "Every coin ever earned, so the total survives future spending."
    lifetime_earned: Float!
    "Percent of a pod join currently granted back as coins."
    earn_pct: Float!
    "Percent of a shop order currently granted back as coins."
    shop_earn_pct: Float!
  }

  """
  Every rule that decides how many coins someone is given, in one place
  (Finance > Duncit Coin > Settings).
  """
  type CoinSettings {
    "Percent of a pod-ticket payment granted back to the buyer (0 turns it off)."
    pod_join_earn_pct: Int!
    "Percent of a shop/product order granted back to the buyer (0 turns it off)."
    shop_earn_pct: Int!
    "Flat coins paid to EACH side of a referral — the referrer and the new member."
    coins_per_referral: Int!
    updated_at: String!
  }

  "Every field is optional; an omitted one is left alone."
  input CoinSettingsInput {
    pod_join_earn_pct: Int
    shop_earn_pct: Int
    coins_per_referral: Int
  }

  "What one manual adjustment left behind, so the console can confirm it landed."
  type CoinAdjustResult {
    user_id: ID!
    balance: Float!
    lifetime_earned: Float!
    "Signed movement: positive for a grant, negative for a deduction."
    applied: Float!
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
    "Percent of a pod join currently granted back as coins."
    earn_pct: Float!
    "Percent of a shop order currently granted back as coins."
    shop_earn_pct: Float!
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
    """
    Who the coins moved for. Taken from the buyer name frozen on the payment,
    and looked up on the account for the rows that have no payment — a referral
    credit or a manual adjustment names its person too.
    """
    user_name: String!
    user_email: String!
    "Who typed this adjustment. Empty on every automatic row."
    admin_name: String!
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

  """
  One account the manual-adjustment picker can offer. Deliberately narrow: the
  full User type would ship a profile per keystroke, and the balance is the one
  extra fact an admin needs before typing an amount.
  """
  type CoinUserOption {
    id: ID!
    full_name: String!
    email: String!
    balance: Float!
  }

  extend type Query {
    myCoinBalance: CoinBalance!
    myCoinTransactions: [CoinTransaction!]!
    "Finance > Duncit Coin > Dashboard. 'months' bounds the distribution series (default 12, max 36)."
    coinAdminStats(months: Int): CoinAdminStats!
    "Finance > Duncit Coin > Transactions. 'pod_doc_id' scopes the page to coins settled by that pod's payments."
    coinTransactionsTable(query: TableQueryInput, pod_doc_id: ID): CoinAdminTransactionTablePage!
    "Every coin payout rule, for Finance > Duncit Coin > Settings."
    coinSettings: CoinSettings!
    "Name/email search for the manual-adjustment picker. Under two characters returns nothing."
    coinUserSearch(term: String!): [CoinUserOption!]!
  }

  extend type Mutation {
    "Finance: set what a pod join, a shop order and a referral each pay."
    updateCoinSettings(input: CoinSettingsInput!): CoinSettings!
    """
    Finance: hand one named account coins, or take them back.

    'reason' is required — a manual row has no payment or referral to explain
    itself, so the words are the whole audit trail. A deduction larger than the
    balance is refused rather than partially applied.
    """
    adjustUserCoins(
      user_id: ID!
      direction: CoinAdjustDirection!
      coins: Int!
      reason: String!
    ): CoinAdjustResult!
  }

  enum CoinAdjustDirection {
    GRANT
    DEDUCT
  }
`;
