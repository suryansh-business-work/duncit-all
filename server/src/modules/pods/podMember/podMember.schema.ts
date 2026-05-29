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

  extend type Query {
    myPodMemberships(status: MembershipStatus): [PodMember!]!
    podMembershipState(pod_doc_id: ID!): PodMembershipState!
    podMembers(pod_doc_id: ID!, status: MembershipStatus): [PodMember!]!
    referralLookup(token: String!): PodMember
  }

  extend type Mutation {
    joinFreePod(pod_doc_id: ID!, referral_token: String): PodMember!
    backoutPod(pod_doc_id: ID!): PodMember!
    redeemPodReferral(token: String!): PodMember!
  }
`;
