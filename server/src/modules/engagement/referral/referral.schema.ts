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
    "Admin: set the gift shown to users for referring friends."
    updateReferralGift(gift_description: String!): ReferralSettings!
  }
`;
