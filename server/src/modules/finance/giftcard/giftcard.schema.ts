export const giftCardTypeDefs = /* GraphQL */ `
  """
  The card's theme — what it was bought "for". SUPER/CATEGORY/SUB reference one
  category of that level; SHOP is the global Pod Shop. The scope decides the
  card's design and title, not where the value can be spent: redeeming converts
  the full value into Duncit Coins.
  """
  enum GiftCardScopeType {
    SHOP
    SUPER
    CATEGORY
    SUB
  }

  "EXPIRED is derived from the expiry date at read time."
  enum GiftCardStatus {
    ACTIVE
    REDEEMED
    EXPIRED
  }

  """
  A purchased gift card. A bearer instrument: whoever holds the code holds the
  value, which is what sharing it by email or link means. Redeeming converts the
  whole balance into Duncit Coins in one act.
  """
  type GiftCard {
    id: ID!
    "Redemption code (XXXX-XXXX-XXXX-XXXX)."
    code: String!
    scope_type: GiftCardScopeType!
    scope_category_id: ID
    "Snapshot of the category name — empty for SHOP cards (clients localize it)."
    scope_name: String!
    scope_image_url: String!
    initial_amount: Float!
    "Equals initial_amount until redeemed, then 0."
    balance: Float!
    status: GiftCardStatus!
    recipient_email: String!
    recipient_name: String!
    "Personal note printed on the card and in the email."
    message: String!
    redeemed: Boolean!
    redeemed_at: String
    expires_at: String!
    created_at: String!
    "The buyer's name — filled on the code-lookup view so the claim page can say who sent it."
    sender_name: String
  }

  "The caller's cards: held or redeemed by them, and the ones they gifted away."
  type MyGiftCards {
    owned: [GiftCard!]!
    gifted: [GiftCard!]!
  }

  "What redeeming a card left behind: the coins minted and the new balance."
  type GiftCardRedeemResult {
    "Coins credited by THIS call — 0 when the card had already paid out."
    coins_added: Float!
    "The caller's Duncit Coin balance after the credit."
    coin_balance: Float!
    card: GiftCard!
  }

  "The gift card sales policy (Finance > Gift Cards)."
  type GiftCardSettings {
    "Preset amount chips the buy page offers."
    denominations: [Int!]!
    "Bounds for a custom amount (whole rupees)."
    min_amount: Int!
    max_amount: Int!
    "Months from purchase until a card expires."
    validity_months: Int!
    updated_at: String!
  }

  "Every field is optional; an omitted one is left alone."
  input GiftCardSettingsInput {
    denominations: [Int!]
    min_amount: Int
    max_amount: Int
    validity_months: Int
  }

  "One calendar month of gift card flow. The client formats the label from the key."
  type GiftCardMonthBucket {
    "Calendar month as a 'YYYY-MM' key, in UTC."
    month: String!
    sold: Float!
    redeemed: Float!
  }

  """
  Platform-wide gift card position for Finance > Gift Cards > Dashboard.
  Outstanding + expired + redeemed value always equals sold value.
  """
  type GiftCardAdminStats {
    "Cards ever sold."
    sold_count: Int!
    "Value ever sold — the sum of all ISSUE rows."
    sold_value: Float!
    "Cards converted to coins."
    redeemed_count: Int!
    "Value converted to coins — the sum of all REDEEM rows."
    redeemed_value: Float!
    "Value still sitting on live, unexpired cards — the platform's liability."
    outstanding_value: Float!
    "Value on cards that expired unredeemed — breakage."
    expired_value: Float!
    "Months a card currently lives from purchase."
    validity_months: Int!
    currency_symbol: String!
    "Oldest first, one entry per calendar month, empty months filled with zeroes."
    monthly: [GiftCardMonthBucket!]!
  }

  "One card of the book, joined with who bought it and who redeemed it."
  type GiftCardAdminCard {
    id: ID!
    code: String!
    scope_type: GiftCardScopeType!
    scope_category_id: ID
    scope_name: String!
    scope_image_url: String!
    initial_amount: Float!
    balance: Float!
    status: GiftCardStatus!
    recipient_email: String!
    recipient_name: String!
    message: String!
    redeemed: Boolean!
    redeemed_at: String
    expires_at: String!
    created_at: String!
    purchaser_name: String!
    purchaser_email: String!
    redeemer_name: String!
    redeemer_email: String!
    "The purchase payment's business id."
    payment_id: String!
  }

  "Server-side table page for the shared table engine (giftCardsTable)."
  type GiftCardAdminCardTablePage {
    rows: [GiftCardAdminCard!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "One row of the gift card ledger — insert-only, newest first."
  type GiftCardAdminTransaction {
    id: ID!
    gift_card_id: ID!
    code: String!
    user_id: ID!
    "The purchaser on ISSUE rows, the redeemer on REDEEM rows."
    user_name: String!
    user_email: String!
    "ISSUE or REDEEM."
    type: String!
    amount: Float!
    balance_after: Float!
    "PURCHASE or REDEEM_TO_COINS."
    source: String!
    "The purchase payment on ISSUE rows."
    payment_id: String
    created_at: String!
  }

  "Server-side table page for the shared table engine (giftCardTransactionsTable)."
  type GiftCardAdminTransactionTablePage {
    rows: [GiftCardAdminTransaction!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    "Amount presets and validity for the buy page. Signed-in only."
    publicGiftCardSettings: GiftCardSettings!
    "The caller's gift cards — held or redeemed, and gifted away."
    myGiftCards: MyGiftCards!
    "One card by its code, for the claim/redeem page. Holding the code is holding the value, so any signed-in holder may look."
    giftCardByCode(code: String!): GiftCard!
    "Finance > Gift Cards > Dashboard. 'months' bounds the monthly series (default 12, max 36)."
    giftCardAdminStats(months: Int): GiftCardAdminStats!
    "Finance > Gift Cards > Cards. Every card ever sold, with buyer and redeemer."
    giftCardsTable(query: TableQueryInput): GiftCardAdminCardTablePage!
    "Finance > Gift Cards > Logs. Every issue and every conversion to coins."
    giftCardTransactionsTable(query: TableQueryInput): GiftCardAdminTransactionTablePage!
  }

  extend type Mutation {
    """
    Convert a gift card's full value into Duncit Coins for the caller. The first
    redeemer of a shared code wins; a repeat call by the same person is a no-op
    that reports coins_added: 0.
    """
    redeemGiftCard(code: String!): GiftCardRedeemResult!
    "Finance: set the amounts offered and how long a card lives."
    updateGiftCardSettings(input: GiftCardSettingsInput!): GiftCardSettings!
  }
`;
