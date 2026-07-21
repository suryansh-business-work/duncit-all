export const podMemberTypeDefs = /* GraphQL */ `
  enum MembershipStatus {
    JOINED
    BACKOUT_IN_PROCESS
    BACKED_OUT
  }

  "Lifecycle of a single Backout request (one per Confirm Backout)."
  enum BackoutStatus {
    IN_PROCESS
    CANCELLED
    SPOT_FILLED
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
    "Backout attempts used for this pod (each Confirm Backout counts one)."
    backout_count: Int!
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
    "True while the caller's booking is in 'Backout in process'."
    backout_in_process: Boolean!
    "True when the in-process backout can still be cancelled (seat not rebooked)."
    can_cancel_backout: Boolean!
    "Backout attempts the caller has used for this pod."
    backout_attempts_used: Int!
    "Max Backout attempts per user per pod (Admin > Pods > Pod Settings)."
    backout_attempts_max: Int!
    "Global Backouts deduction % applied to a backout refund."
    backout_deduction_pct: Float!
    "Estimated refund after deduction for the caller's paid booking (null for free)."
    backout_refund_amount: Float
  }

  "One recorded Backout lifecycle event (immutable, chronological)."
  type BackoutEvent {
    status: BackoutStatus!
    "The user's backout-attempt count for this pod when the event happened."
    backout_count: Int!
    at: String!
  }

  "A Backout request — powers the Finance 'Backout Refunds' list + detail."
  type BackoutRefundRequest {
    id: ID!
    "Permanent, globally unique Backout ID (DUN-BKO-000001)."
    backout_no: String!
    pod_id: ID!
    pod: Pod
    user_id: ID!
    user_name: String
    user_email: String
    status: MembershipStatus!
    "Lifecycle status of this Backout request."
    backout_status: BackoutStatus!
    "1-based backout attempt this request represents for the user+pod."
    attempt_no: Int!
    "Backout attempts the user has used for this pod so far."
    backout_attempts_used: Int!
    "Max Backout attempts per user per pod (Admin > Pods > Pod Settings)."
    max_backout_attempts: Int!
    "True once a replacement booked the released seat (Spot Filled)."
    replacement_confirmed: Boolean!
    joined_at: String!
    backed_out_at: String
    refund_status: RefundStatus!
    payment_id: ID
    payment_amount: Float
    payment_currency: String
    payment_status: String
    "Backouts deduction % snapshotted when the request was created."
    deduction_pct: Float!
    "Estimated refund after deduction (null for free bookings)."
    refund_amount: Float
    "Set once Finance processed the refund (one refund per request)."
    refund_processed_at: String
    "Immutable, chronological Backout lifecycle timeline."
    events: [BackoutEvent!]!
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
    "Finance-only: every Backout request ever raised (all statuses, for audit)."
    backoutRefundRequests: [BackoutRefundRequest!]!
    backoutRefundRequestsTable(query: TableQueryInput): BackoutRefundRequestTablePage!
    backoutRefundRequest(id: ID!): BackoutRefundRequest
  }

  extend type Mutation {
    joinFreePod(pod_doc_id: ID!, referral_token: String): PodMember!
    "Confirm Backout — booking moves to 'Backout in process' and the seat is released."
    backoutPod(pod_doc_id: ID!): PodMember!
    "Keep My Spot — cancel an in-process backout and restore the booking (seat must still be free)."
    cancelBackoutPod(pod_doc_id: ID!): PodMember!
    redeemPodReferral(token: String!): PodMember!
    "Rejoin a pod the caller previously backed out of — no payment, until the pod completes."
    rejoinPod(pod_doc_id: ID!): PodMember!
    "Finance-only: process the refund for a Spot Filled Backout request (one refund per request)."
    processBackoutRefund(id: ID!): BackoutRefundRequest!
  }
`;
