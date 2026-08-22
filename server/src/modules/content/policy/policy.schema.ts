export const policyTypeDefs = /* GraphQL */ `
  type Policy {
    id: ID!
    "Permanent, globally unique handle (POL-000001). Never edited, never reused."
    policy_no: String!
    slug: String!
    title: String!
    "What kind of policy this is — the grouping the dashboard counts by."
    policy_type: String!
    content: String!
    is_active: Boolean!
    "Whether accepting this is a condition of creating an account."
    requires_signup_acceptance: Boolean!
    sort_order: Int!
    "Every wording it has had, the live one included. Never fewer than 1."
    version_count: Int!
    "sha256 of the CURRENT wording — what a fresh acceptance records."
    content_hash: String!
    "When Legal last emailed everyone who had accepted it."
    last_notified_at: String
    "How many accounts that notice reached."
    last_notified_count: Int!
    created_at: String!
    updated_at: String!
  }

  """
  One wording a policy has had.

  The stored history holds only SUPERSEDED wordings; the live document is
  returned as the newest entry, flagged \`is_current\`. \`content_hash\` is what
  makes an acceptance row readable — the log records the hash of what somebody
  agreed to and nothing else.
  """
  type PolicyVersion {
    id: ID!
    "1 for the earliest wording, counting up. The newest is the live one."
    version_no: Int!
    title: String!
    slug: String!
    policy_type: String!
    content: String!
    content_hash: String!
    updated_by: ID
    "Resolved at read time, so a renamed account still reads correctly."
    updated_by_name: String!
    created_at: String!
    "True for the wording in force right now."
    is_current: Boolean!
  }

  type PolicyTypeCount {
    policy_type: String!
    count: Int!
  }

  type PolicyStats {
    total: Int!
    by_type: [PolicyTypeCount!]!
  }

  "Server-side table page over the by-type aggregate (policyStatsTable)."
  type PolicyTypeCountTablePage {
    rows: [PolicyTypeCount!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "Server-side table page for the shared table engine (policiesTable)."
  type PolicyTablePage {
    rows: [Policy!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input PolicyFilterInput {
    is_active: Boolean
    search: String
  }

  input CreatePolicyInput {
    slug: String!
    title: String!
    policy_type: String
    content: String
    is_active: Boolean
    "Omitted means true — every policy gates signup until Legal says otherwise."
    requires_signup_acceptance: Boolean
    sort_order: Int
  }

  input UpdatePolicyInput {
    slug: String
    title: String
    policy_type: String
    content: String
    is_active: Boolean
    requires_signup_acceptance: Boolean
    sort_order: Int
    """
    Email everyone who has already accepted this policy that it changed.

    A deliberate tick, never inferred: a typo fix in a heading is not a reason
    to write to everybody. Ignored unless the CONTENT actually changed, because
    a notice about an unchanged policy is a notice nobody can act on.
    """
    notify_accepted_users: Boolean
    "Legal's own note on what changed, shown in the notice. Optional."
    notify_summary: String
  }

  extend type Query {
    policies(filter: PolicyFilterInput): [Policy!]!
    policiesTable(query: TableQueryInput): PolicyTablePage!
    policyStats: PolicyStats!
    policyStatsTable(query: TableQueryInput): PolicyTypeCountTablePage!
    policy(policy_doc_id: ID!): Policy
    "Legal: every wording this policy has had, oldest first."
    policyVersions(policy_doc_id: ID!): [PolicyVersion!]!
    """
    Legal: how many accounts a change notice would reach right now.

    Counted from the acceptance log rather than stored, because the answer
    changes every time somebody accepts. It is what lets the notify checkbox
    say what pressing it does before anyone presses it.
    """
    policyNotifyRecipientCount(policy_doc_id: ID!): Int!
    policyBySlug(slug: String!): Policy
    publicPolicies: [Policy!]!
    "The policy rendered as a downloadable PDF (base64)."
    policyPdfBase64(slug: String!): String!
  }

  extend type Mutation {
    createPolicy(input: CreatePolicyInput!): Policy!
    updatePolicy(policy_doc_id: ID!, input: UpdatePolicyInput!): Policy!
    deletePolicy(policy_doc_id: ID!): Boolean!
    """
    Send the change notice on its own, without editing anything.

    The same mail the update checkbox sends, for when Legal decides afterwards
    that people should have been told. Returns how many accounts it reached.
    """
    notifyPolicyAcceptedUsers(policy_doc_id: ID!, summary: String): Int!
    "One-time repair: give an id to any policy that has none."
    backfillPolicyIds: EntityIdBackfillResult!
  }
`;
