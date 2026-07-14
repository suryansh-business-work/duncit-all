export const podMemberTypeDefs = /* GraphQL */ `
  enum MembershipStatus {
    JOINED
    BACKED_OUT
  }

  enum RefundStatus {
    NONE
    PENDING
    PROCESSED
    NOT_ELIGIBLE
  }

  enum JoinSource {
    DIRECT
    REFERRAL
    PAID
    FREE
    HOST_ADD
  }

  type PodMember {
    id: ID!
    pod_id: ID!
    pod: Pod
    user_id: ID!
    status: MembershipStatus!
    joined_at: String!
    backed_out_at: String
    payment_id: ID
    source: JoinSource!
    referral_token: String
    referred_by: ID
    refund_status: RefundStatus!
    refund_payment_id: ID
    created_at: String!
    updated_at: String!
  }

  type PodMembershipState {
    pod_id: ID!
    is_member: Boolean!
    status: MembershipStatus
    membership: PodMember
    spots_taken: Int!
    spots_total: Int!
    can_backout: Boolean!
    can_join: Boolean!
    refund_threshold_pct: Int!
  }

  "A member who has backed out of a pod — powers the Finance 'Backout Refunds' list + detail."
  type BackoutRefundRequest {
    id: ID!
    pod_id: ID!
    pod: Pod
    user_id: ID!
    user_name: String
    user_email: String
    status: MembershipStatus!
    joined_at: String!
    backed_out_at: String
    refund_status: RefundStatus!
    payment_id: ID
    payment_amount: Float
    payment_currency: String
    payment_status: String
    refund_threshold_pct: Int!
    created_at: String!
  }

  "Server-side table page for the shared table engine (backoutRefundRequestsTable)."
  type BackoutRefundRequestTablePage {
    rows: [BackoutRefundRequest!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    myPodMemberships(status: MembershipStatus): [PodMember!]!
    podMembershipState(pod_doc_id: ID!): PodMembershipState!
    podMembers(pod_doc_id: ID!, status: MembershipStatus): [PodMember!]!
    referralLookup(token: String!): PodMember
    "Finance-only: every currently backed-out member (rejoined members drop off)."
    backoutRefundRequests: [BackoutRefundRequest!]!
    backoutRefundRequestsTable(query: TableQueryInput): BackoutRefundRequestTablePage!
    backoutRefundRequest(id: ID!): BackoutRefundRequest
  }

  extend type Mutation {
    joinFreePod(pod_doc_id: ID!, referral_token: String): PodMember!
    backoutPod(pod_doc_id: ID!): PodMember!
    redeemPodReferral(token: String!): PodMember!
    "Rejoin a pod the caller previously backed out of — no payment, until the pod completes."
    rejoinPod(pod_doc_id: ID!): PodMember!
  }
`;
