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

  extend type Query {
    "My code + everyone I brought in (generates the code on first read)."
    myReferral: MyReferral!
  }

  extend type Mutation {
    "Redeem someone's referral code (once per account, not your own)."
    applyReferralCode(code: String!): MyReferral!
  }
`;
