export const couponTypeDefs = /* GraphQL */ `
  enum CouponScope {
    GLOBAL
    POD
  }

  type Coupon {
    id: ID!
    code: String!
    description: String!
    discount_pct: Float!
    scope: CouponScope!
    pod_id: ID
    pod: Pod
    valid_from: String
    valid_until: String
    max_uses: Int
    per_user_limit: Int
    min_order_amount: Float!
    used_count: Int!
    is_active: Boolean!
    created_at: String!
    updated_at: String!
  }

  "Result of evaluating a coupon against an order — drives the strikethrough UI."
  type CouponPreview {
    ok: Boolean!
    message: String
    code: String
    discount_pct: Float
    original_total: Float!
    discount_amount: Float!
    final_total: Float!
    currency_symbol: String!
  }

  input CouponPreviewInput {
    code: String!
    pod_id: ID
    amount: Float!
  }

  input CouponFilterInput {
    scope: CouponScope
    pod_id: ID
    is_active: Boolean
    search: String
  }

  input CreateCouponInput {
    code: String!
    description: String
    discount_pct: Float!
    scope: CouponScope!
    pod_id: ID
    valid_from: String
    valid_until: String
    max_uses: Int
    per_user_limit: Int
    min_order_amount: Float
    is_active: Boolean
  }

  input UpdateCouponInput {
    code: String
    description: String
    discount_pct: Float
    scope: CouponScope
    pod_id: ID
    valid_from: String
    valid_until: String
    max_uses: Int
    per_user_limit: Int
    min_order_amount: Float
    is_active: Boolean
  }

  extend type Query {
    coupons(filter: CouponFilterInput): [Coupon!]!
    coupon(id: ID!): Coupon
    couponsForPod(pod_id: ID!): [Coupon!]!
    "Active, currently-valid coupons a shopper can apply (global + this pod)."
    availableCouponsForPod(pod_id: ID): [Coupon!]!
    previewCoupon(input: CouponPreviewInput!): CouponPreview!
  }

  extend type Mutation {
    createCoupon(input: CreateCouponInput!): Coupon!
    updateCoupon(id: ID!, input: UpdateCouponInput!): Coupon!
    deleteCoupon(id: ID!): Boolean!
  }
`;
