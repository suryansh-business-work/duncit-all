export const referralTypeDefs = /* GraphQL */ `
  type ReferralEntry {
    user_id: ID!
    full_name: String
    referred_at: String!
  }

  "The signed-in user's referral state — code, gift on offer and redemptions."
  type MyReferral {
    code: String!
    gift_description: String!
    "Coins EACH side of a referral earns — the referrer and the new member."
    coins_per_referral: Int!
    """
    The Finance-written message a share sheet pre-fills, with its {code},
    {link} and {coins} placeholders still in it. Empty when Finance has not
    written one, which the apps answer with their shipped default.
    """
    share_message: String!
    referred: [ReferralEntry!]!
    "Name of whoever referred this user; null when nobody has."
    referred_by_name: String
  }

  type AdminReferral {
    id: ID!
    code: String!
    referrer_user_id: ID!
    referrer_name: String
    referred_user_id: ID!
    referred_name: String
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
    Read-only here: it is a coin payout rule, set in Finance > Duncit Coin >
    Settings alongside the earn rates, and reported here so the copy that quotes
    it can never drift from what is actually paid.
    """
    coins_per_referral: Int!
    "Share message template, with its {code}, {link} and {coins} placeholders."
    share_message: String!
  }

  "Finance > Referrals. Every field is optional; an omitted one is left alone."
  input ReferralSettingsInput {
    gift_description: String
    share_message: String
  }

  extend type Query {
    "My code + everyone I brought in (generates the code on first read)."
    myReferral: MyReferral!
    "Admin: every redeemed referral, newest first."
    referrals: [AdminReferral!]!
    referralsTable(query: TableQueryInput): AdminReferralTablePage!
    referralSettings: ReferralSettings!
  }

  extend type Mutation {
    "Redeem someone's referral code (once per account, not your own)."
    applyReferralCode(code: String!): MyReferral!
    "Finance: what a referral pays and what a member's share sheet says."
    updateReferralSettings(input: ReferralSettingsInput!): ReferralSettings!
  }
`;
