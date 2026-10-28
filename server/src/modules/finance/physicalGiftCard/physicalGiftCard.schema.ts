export const physicalGiftCardTypeDefs = /* GraphQL */ `
  "EXPIRED is derived from the expiry date at read time; VOID is a card the Loyalty team cancelled."
  enum PhysicalGiftCardStatus {
    ACTIVE
    REDEEMED
    VOID
    EXPIRED
  }

  "A printed scratch card as its holder sees it — never the passcode."
  type PhysicalGiftCard {
    id: ID!
    "The 9-digit number printed on the card."
    card_number: String!
    coins: Int!
    status: PhysicalGiftCardStatus!
    redeemed_at: String
    expires_at: String!
  }

  "What redeeming a printed card left behind: the coins minted and the new balance."
  type PhysicalGiftCardRedeemResult {
    "Coins credited by THIS call — 0 when the card had already paid out to the caller."
    coins_added: Float!
    "The caller's Duncit Coin balance after the credit."
    coin_balance: Float!
    card: PhysicalGiftCard!
  }

  "One printed card in the Loyalty console, joined with its batch and the people on it."
  type PhysicalGiftCardAdminCard {
    id: ID!
    card_number: String!
    "Only the last four digits — the full passcode is read through physicalGiftCardPasscode."
    passcode_last4: String!
    coins: Int!
    status: PhysicalGiftCardStatus!
    batch_id: ID!
    batch_label: String!
    "The member the card is mapped to: chosen at generation, or whoever redeemed a bulk card."
    assigned_user_id: ID
    assigned_user_name: String!
    assigned_user_email: String!
    redeemed_by_user_id: ID
    redeemer_name: String!
    redeemer_email: String!
    redeemed_at: String
    expires_at: String!
    created_at: String!
    created_by_name: String!
    voided_at: String
    voided_by_name: String!
    void_reason: String!
  }

  type PhysicalGiftCardAdminCardTablePage {
    rows: [PhysicalGiftCardAdminCard!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "One generation run — every card minted together, each carrying the same coins."
  type PhysicalGiftCardBatch {
    id: ID!
    label: String!
    "Coins on each card."
    coins: Int!
    quantity: Int!
    "coins x quantity — what the batch is worth if every card is redeemed."
    total_coins: Int!
    "True when every card was mapped to a member at generation."
    assigned: Boolean!
    expires_at: String!
    created_at: String!
    created_by_name: String!
    created_by_email: String!
    redeemed_count: Int!
    redeemed_coins: Int!
    voided_count: Int!
  }

  type PhysicalGiftCardBatchTablePage {
    rows: [PhysicalGiftCardBatch!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  """
  One line of the physical card history: GENERATED, REDEEMED, VOIDED,
  REDEEM_FAILED (a wrong number or passcode), PASSCODE_VIEWED or
  PASSCODES_EXPORTED (a person read the passcodes in the console).
  """
  type PhysicalGiftCardEvent {
    id: ID!
    card_id: ID
    card_number: String!
    batch_id: ID
    batch_label: String!
    type: String!
    coins: Int!
    note: String!
    "The admin on generation, cancellation and passcode reads; the member on redemption tries."
    actor_user_id: ID!
    actor_name: String!
    actor_email: String!
    created_at: String!
  }

  type PhysicalGiftCardEventTablePage {
    rows: [PhysicalGiftCardEvent!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "One calendar month of physical card flow, in coins. The client formats the label from the key."
  type PhysicalGiftCardMonthBucket {
    "Calendar month as a 'YYYY-MM' key, in UTC."
    month: String!
    generated: Float!
    redeemed: Float!
  }

  """
  The physical card position for Loyalty > Physical Gift Cards > Dashboard.
  generated = redeemed + outstanding + expired + voided, in cards and in coins.
  """
  type PhysicalGiftCardAdminStats {
    generated_count: Int!
    generated_coins: Float!
    redeemed_count: Int!
    redeemed_coins: Float!
    "Live, unexpired, unredeemed cards — coins the platform still owes."
    outstanding_count: Int!
    outstanding_coins: Float!
    "Cards that lapsed unredeemed."
    expired_count: Int!
    expired_coins: Float!
    voided_count: Int!
    voided_coins: Float!
    "Cards mapped to a member, at generation or by redeeming."
    mapped_count: Int!
    batch_count: Int!
    "Oldest first, one entry per calendar month, empty months filled with zeroes."
    monthly: [PhysicalGiftCardMonthBucket!]!
  }

  "Everything about one printed card."
  type PhysicalGiftCardAdminDetail {
    card: PhysicalGiftCardAdminCard!
    batch: PhysicalGiftCardBatch
    "The card's history, newest first."
    events: [PhysicalGiftCardEvent!]!
    "Null until the card is redeemed."
    coin_credit: GiftCardCoinCredit
  }

  "One line of a batch's print file."
  type PhysicalGiftCardPasscodeRow {
    card_number: String!
    "XXXX-XXXX-XXXX-XXXX."
    passcode: String!
    coins: Int!
    status: PhysicalGiftCardStatus!
    assigned_user_name: String!
    assigned_user_email: String!
    expires_at: String!
  }

  """
  Mint a batch. Give user_ids for one card per member (only that member can
  redeem it), or quantity for unmapped cards (whoever redeems first is mapped).
  """
  input GeneratePhysicalGiftCardsInput {
    label: String!
    "Coins on each card, 1 to the gift card maximum amount."
    coins: Int!
    "Unmapped cards to mint (1-500). Ignored when user_ids is given."
    quantity: Int
    "One card per member (up to 500)."
    user_ids: [ID!]
    "'YYYY-MM-DD' in the app time zone; omitted means the gift card validity from today."
    expires_on: String
  }

  "The limits a new batch is checked against — read live, so the form and the server never disagree."
  type PhysicalGiftCardPolicy {
    "Most coins one card may carry (the gift card maximum amount; 1 coin = 1 rupee)."
    max_coins_per_card: Int!
    "Most cards one generation run may mint."
    max_cards_per_batch: Int!
    "Months a batch stays redeemable when no expiry date is chosen."
    validity_months: Int!
  }

  extend type Query {
    "The limits the Generate Cards form validates against."
    physicalGiftCardPolicy: PhysicalGiftCardPolicy!
    "Loyalty > Physical Gift Cards > Dashboard. 'months' bounds the monthly series (default 12, max 36)."
    physicalGiftCardAdminStats(months: Int): PhysicalGiftCardAdminStats!
    "Loyalty > Physical Gift Cards > Cards. Pass batch_id for one batch's cards."
    physicalGiftCardsTable(query: TableQueryInput, batch_id: ID): PhysicalGiftCardAdminCardTablePage!
    "Loyalty > Physical Gift Cards > Batches."
    physicalGiftCardBatchesTable(query: TableQueryInput): PhysicalGiftCardBatchTablePage!
    "One batch, for its page header."
    physicalGiftCardBatch(id: ID!): PhysicalGiftCardBatch!
    "Loyalty > Physical Gift Cards > History. Every card minted, redeemed, tried, cancelled or read."
    physicalGiftCardEventsTable(query: TableQueryInput): PhysicalGiftCardEventTablePage!
    "Loyalty > Physical Gift Cards > one card."
    physicalGiftCardAdminDetail(id: ID!): PhysicalGiftCardAdminDetail!
    "One card's full passcode. Every read is written to the card's history."
    physicalGiftCardPasscode(id: ID!): String!
    "A batch's print file — every card with its passcode. The export is written to the history."
    physicalGiftCardBatchPasscodes(batch_id: ID!): [PhysicalGiftCardPasscodeRow!]!
  }

  extend type Mutation {
    """
    Turn a printed card into Duncit Coins for the caller. A wrong number and a
    wrong passcode get the same answer; too many wrong tries pause redeeming
    for the caller for an hour.
    """
    redeemPhysicalGiftCard(card_number: String!, passcode: String!): PhysicalGiftCardRedeemResult!
    "Loyalty: mint a batch of printed cards."
    generatePhysicalGiftCards(input: GeneratePhysicalGiftCardsInput!): PhysicalGiftCardBatch!
    "Loyalty: cancel an unredeemed card so it can never pay out."
    voidPhysicalGiftCard(id: ID!, reason: String!): PhysicalGiftCardAdminCard!
  }
`;
