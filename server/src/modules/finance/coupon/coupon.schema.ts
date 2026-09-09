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

  "Server-side table page for the shared table engine (couponsTable / couponsForPodTable)."
  type CouponTablePage {
    rows: [Coupon!]!
    total: Int!
    page: Int!
    page_size: Int!
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

  "What a coupon has actually done — the figures a detail page states above its redemption table."
  type CouponStats {
    "The coupon's own counter, incremented by the checkout finalizer."
    used_count: Int!
    "Distinct buyers behind those redemptions."
    unique_users: Int!
    "Rupees taken off orders by this code."
    total_discount: Float!
    "What those discounted orders were actually charged."
    order_value: Float!
    "Null when the coupon has no usage cap."
    remaining_uses: Int
    last_redeemed_at: String
    currency_symbol: String!
  }

  "One payment that consumed the coupon."
  type CouponRedemption {
    id: ID!
    payment_id: String!
    invoice_no: String
    user_id: ID
    user_name: String!
    user_email: String!
    user_phone: String
    pod_id: ID
    description: String!
    total: Float!
    coupon_discount: Float!
    status: String!
    paid_at: String
    created_at: String!
  }

  type CouponRedemptionTablePage {
    rows: [CouponRedemption!]!
    total: Int!
    page: Int!
    page_size: Int!
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
    couponsTable(query: TableQueryInput): CouponTablePage!
    coupon(id: ID!): Coupon
    "Redemption figures for one coupon's detail page."
    couponStats(id: ID!): CouponStats!
    "The payments that consumed one coupon — the detail page's history table."
    couponRedemptionsTable(id: ID!, query: TableQueryInput): CouponRedemptionTablePage!
    couponsForPod(pod_id: ID!): [Coupon!]!
    "Table sibling of couponsForPod — this pod's coupons plus every GLOBAL coupon."
    couponsForPodTable(pod_id: ID!, query: TableQueryInput): CouponTablePage!
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
