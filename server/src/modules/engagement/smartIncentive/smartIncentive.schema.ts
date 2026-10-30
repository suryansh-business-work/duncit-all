/**
 * Smart Incentive — the member's side: a pod page counts down to the host's
 * offer and unlocks it. Kept apart from the Loyalty console's fields
 * (smartIncentive.admin.schema.ts): these are filed under the Pods MCP
 * category, the console ones under Loyalty.
 */
export const smartIncentiveTypeDefs = /* GraphQL */ `
  "A pod page's Smart Incentive for the signed-in member."
  type PodSmartIncentive {
    pod_id: ID!
    "Percent off the ticket money, after any multi-ticket discount. Frozen once unlocked."
    discount_pct: Int!
    "Seconds on the pod page before the offer shows (Loyalty > Smart Incentive > Settings)."
    delay_seconds: Int!
    "True once the offer was shown: checkout takes it off on its own."
    unlocked: Boolean!
  }

  extend type Query {
    """
    The signed-in member's Smart Incentive on one pod. Null when there is
    nothing to offer them: the programme is off, the pod does not offer it or
    can no longer be booked, or they host it or already hold a seat.
    """
    podSmartIncentive(pod_id: ID!): PodSmartIncentive
  }

  extend type Mutation {
    "The pod page showed the offer: unlock it for the signed-in member. Idempotent; refused when the pod offers them none."
    unlockSmartIncentive(pod_id: ID!): PodSmartIncentive!
  }
`;
