import gql from 'graphql-tag';

export const membershipTypeDefs = gql`
  """
  One membership tier. Every price is TEXT, not a number: a tier can read
  "Free" or "Invite only", and the currency is part of what Admin edits.
  """
  type MembershipPlan {
    id: ID!
    key: String!
    name: String!
    "One line under the name — who the tier is for."
    tagline: String!
    "The headline price as shown, for example 1,499 with its currency symbol."
    price_label: String!
    "The qualifier under the price, for example: / year or a monthly alternative."
    price_note: String!
    "Ribbon on the card. Empty means no ribbon."
    badge_label: String!
    "Hex accent for the card. Empty falls back to the app's primary colour."
    accent_color: String!
    "Label on the call to action, which stays disabled while membership is coming soon."
    cta_label: String!
    sort_order: Int!
    is_active: Boolean!
    created_at: String
    updated_at: String
  }

  "One plan's cell on a comparison row. Free text so a cell can read 12h, 10% or a tick."
  type MembershipBenefitValue {
    plan_key: String!
    value: String!
  }

  "One row of the comparison table, with a cell per plan."
  type MembershipBenefit {
    id: ID!
    "Section heading the row sits under. Rows group by this, in sort order."
    group: String!
    label: String!
    values: [MembershipBenefitValue!]!
    sort_order: Int!
    is_active: Boolean!
    created_at: String
    updated_at: String
  }

  """
  The whole pricing screen in one round trip. is_subscribed is the CALLER's
  own state, which is why this query is never response-cached.
  """
  type MembershipPricing {
    plans: [MembershipPlan!]!
    benefits: [MembershipBenefit!]!
    "True when the caller already asked to be told when membership opens."
    is_subscribed: Boolean!
  }

  "Somebody who asked to be notified when membership opens."
  type MembershipNewsSubscriber {
    id: ID!
    user_id: ID!
    email: String!
    name: String!
    created_at: String!
  }

  "Server-side table page for the shared table engine (membershipPlansTable)."
  type MembershipPlanTablePage {
    rows: [MembershipPlan!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "Server-side table page for the shared table engine (membershipBenefitsTable)."
  type MembershipBenefitTablePage {
    rows: [MembershipBenefit!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "Server-side table page for the shared table engine (membershipNewsSubscribersTable)."
  type MembershipNewsSubscriberTablePage {
    rows: [MembershipNewsSubscriber!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input MembershipPlanInput {
    key: String!
    name: String!
    tagline: String
    price_label: String
    price_note: String
    badge_label: String
    accent_color: String
    cta_label: String
    sort_order: Int
    is_active: Boolean
  }

  "The key is immutable — benefit cells reference it, so renaming would orphan them."
  input MembershipPlanUpdateInput {
    name: String
    tagline: String
    price_label: String
    price_note: String
    badge_label: String
    accent_color: String
    cta_label: String
    sort_order: Int
    is_active: Boolean
  }

  input MembershipBenefitValueInput {
    plan_key: String!
    value: String
  }

  input MembershipBenefitInput {
    group: String!
    label: String!
    values: [MembershipBenefitValueInput!]
    sort_order: Int
    is_active: Boolean
  }

  "A present values array replaces the whole row; scalars are patched individually."
  input MembershipBenefitUpdateInput {
    group: String
    label: String
    values: [MembershipBenefitValueInput!]
    sort_order: Int
    is_active: Boolean
  }

  extend type Query {
    "The membership pricing screen — mWeb and the native app render this."
    membershipPricing: MembershipPricing!
    "Admin > Membership > Plans."
    membershipPlans: [MembershipPlan!]!
    membershipPlansTable(query: TableQueryInput): MembershipPlanTablePage!
    "Admin > Membership > Plans > Benefits."
    membershipBenefits: [MembershipBenefit!]!
    membershipBenefitsTable(query: TableQueryInput): MembershipBenefitTablePage!
    "Admin > Membership > Subscribers."
    membershipNewsSubscribersTable(query: TableQueryInput): MembershipNewsSubscriberTablePage!
  }

  extend type Mutation {
    """
    Add the caller to the notify-me list. The address is read from their
    profile, never from the request, so nobody can subscribe another inbox.
    """
    subscribeMembershipNews: MembershipNewsSubscriber!
    createMembershipPlan(input: MembershipPlanInput!): MembershipPlan!
    updateMembershipPlan(plan_id: ID!, input: MembershipPlanUpdateInput!): MembershipPlan!
    deleteMembershipPlan(plan_id: ID!): Boolean!
    createMembershipBenefit(input: MembershipBenefitInput!): MembershipBenefit!
    updateMembershipBenefit(benefit_id: ID!, input: MembershipBenefitUpdateInput!): MembershipBenefit!
    deleteMembershipBenefit(benefit_id: ID!): Boolean!
  }
`;
