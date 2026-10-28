/**
 * Loyalty > Refer & Earn — the admin side of referrals. Kept apart from the
 * member fields (referral.schema.ts) because it belongs to a different console:
 * these are filed under the Loyalty MCP category, the member ones are not.
 */
export const referralAdminTypeDefs = /* GraphQL */ `
  """
  Whether both sides of a referral were credited their coins. UNPAID means the
  credit failed after the referral was recorded, or the rate was 0 coins then.
  """
  enum ReferralPayoutStatus {
    PAID
    PARTIAL
    UNPAID
  }

  type AdminReferral {
    id: ID!
    code: String!
    referrer_user_id: ID!
    referrer_name: String
    referrer_email: String
    referred_user_id: ID!
    referred_name: String
    referred_email: String
    "Coins the ledger paid the member who shared the code."
    referrer_coins: Float!
    "Coins the ledger paid the member who signed up with it."
    referred_coins: Float!
    payout_status: ReferralPayoutStatus!
    "True once the member who signed up has paid for anything."
    converted: Boolean!
    created_at: String!
  }

  "Server-side table page for the shared table engine (referralsTable)."
  type AdminReferralTablePage {
    rows: [AdminReferral!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type ReferralSettings {
    gift_description: String!
    """
    Coins EACH side of a referral earns — the referrer and the new member.
    Read-only here: it is a coin payout rule, set in Loyalty > Duncit Coin >
    Coin Settings alongside the earn rates, and reported here so the copy that quotes
    it can never drift from what is actually paid.
    """
    coins_per_referral: Int!
    "Share message template, with its {code}, {link} and {coins} placeholders."
    share_message: String!
  }

  "Loyalty > Refer & Earn > Settings. Every field is optional; an omitted one is left alone."
  input ReferralSettingsInput {
    gift_description: String
    share_message: String
  }

  "One calendar month (UTC) of the referral programme."
  type ReferralMonthBucket {
    "'YYYY-MM'."
    month: String!
    "Codes redeemed at signup that month."
    joined: Int!
    "Of those, members who have since paid for anything."
    converted: Int!
    "Referral coins credited that month, both sides together."
    coins: Float!
  }

  type ReferralTopReferrer {
    user_id: ID!
    name: String!
    email: String!
    code: String!
    joined: Int!
    converted: Int!
    "Coins this member was credited for referring."
    coins: Float!
  }

  "Loyalty > Refer & Earn > Dashboard. Totals are all-time; 'monthly' covers the chosen window."
  type ReferralAdminStats {
    "Members who have a code — one is made the first time they open Refer & Earn."
    codes_issued: Int!
    "Members whose code has brought at least one signup."
    active_referrers: Int!
    "Codes nobody has signed up with yet."
    idle_codes: Int!
    "Codes redeemed at signup."
    total_referrals: Int!
    "Referred members who have paid for anything since."
    converted: Int!
    "Referred members who have not paid for anything yet."
    awaiting_first_payment: Int!
    "converted / total_referrals, as a percentage (one decimal)."
    conversion_pct: Float!
    coins_paid: Float!
    referrer_coins: Float!
    new_member_coins: Float!
    payouts_paid: Int!
    payouts_partial: Int!
    payouts_unpaid: Int!
    "Today's rate, paid to each side (Loyalty > Duncit Coin > Coin Settings)."
    coins_per_referral: Int!
    monthly: [ReferralMonthBucket!]!
    top_referrers: [ReferralTopReferrer!]!
  }

  "One member's referral code and what it has brought in."
  type AdminReferrer {
    "The code's own id."
    id: ID!
    user_id: ID!
    name: String!
    email: String!
    code: String!
    "When the member first opened Refer & Earn."
    created_at: String!
    joined: Int!
    converted: Int!
    coins_earned: Float!
    "When their code was last redeemed. Null while nobody has signed up with it."
    last_referral_at: String
  }

  "Server-side table page for the shared table engine (referrersTable)."
  type AdminReferrerTablePage {
    rows: [AdminReferrer!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    "Admin: every redeemed referral, newest first."
    referrals: [AdminReferral!]!
    "Loyalty > Refer & Earn > Referrals: who referred whom. Search finds a code or either person by name, email or phone."
    referralsTable(query: TableQueryInput): AdminReferralTablePage!
    referralSettings: ReferralSettings!
    "Loyalty > Refer & Earn > Dashboard. 'months' bounds the monthly series (default 12, max 36)."
    referralAdminStats(months: Int): ReferralAdminStats!
    "Loyalty > Refer & Earn > Referrals: every member's code and what it brought in."
    referrersTable(query: TableQueryInput): AdminReferrerTablePage!
  }

  extend type Mutation {
    "Loyalty: the gift line and the message a member's share sheet pre-fills."
    updateReferralSettings(input: ReferralSettingsInput!): ReferralSettings!
  }
`;
