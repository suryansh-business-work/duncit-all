export const policyAcceptanceTypeDefs = /* GraphQL */ `
  "How a policy acceptance was given."
  enum PolicyAcceptanceMethod {
    "Ticked on the email/password signup form."
    SIGNUP_FORM
    "Ticked in the same dialog, after Google returned but before the account existed."
    GOOGLE_SIGNUP
    "Accepted later from inside the account — predates the gate, or a policy changed."
    ACCOUNT
  }

  "Which app an acceptance was given in. UNKNOWN when the caller did not say."
  enum PolicyAcceptanceSurface {
    MWEB
    APP
    PORTAL
    WEBSITE
    UNKNOWN
  }

  """
  One person's acceptance of one policy — append-only, never edited.

  The policy_* fields are copied onto the row at write time because deleting a
  policy is a HARD delete: a row holding only policy_id would render a blank
  where the thing they agreed to should be.
  """
  type PolicyAcceptance {
    id: ID!
    user_id: ID!
    "Resolved at read time, so a renamed account still reads correctly."
    user_name: String!
    user_email: String!
    policy_id: ID!
    policy_no: String!
    policy_slug: String!
    policy_title: String!
    "sha256 of the policy's content as it read when they accepted it."
    content_hash: String!
    "The policy's own updated_at at that moment."
    policy_updated_at: String!
    method: PolicyAcceptanceMethod!
    surface: PolicyAcceptanceSurface!
    accepted_at: String!
  }

  "Server-side table page for the shared table engine (policyAcceptancesTable)."
  type PolicyAcceptanceTablePage {
    rows: [PolicyAcceptance!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  """
  The accepting account as it reads TODAY.

  Resolved rather than copied, so a renamed or closed account reads correctly —
  and null when the account has been erased entirely, which the row itself
  survives.
  """
  type PolicyAcceptanceAccount {
    id: ID!
    name: String!
    email: String!
    "Blank when no phone was ever collected — signup stopped asking."
    phone: String!
    status: String!
    "True when the account has been deleted. Its acceptance rows remain."
    is_deleted: Boolean!
    created_at: String!
  }

  """
  Everything behind ONE row of the acceptance log.

  A row on its own carries a sha256 and a user id. This is what turns those
  into an answer: who they are now, what the policy says now, the exact wording
  they agreed to, every wording it has had, their own trail through this policy,
  and what else they have accepted.
  """
  type PolicyAcceptanceDetail {
    "The row that was opened."
    acceptance: PolicyAcceptance!
    "Null when the account has been erased."
    account: PolicyAcceptanceAccount
    "Null when the policy has been deleted — the row still reads correctly."
    policy: Policy
    """
    The wording behind this row's content_hash.

    Null when the policy predates version history, which is honest: the hash is
    on the record, the words behind it are not on file.
    """
    accepted_version: PolicyVersion
    "Every wording the policy has had, oldest first."
    versions: [PolicyVersion!]!
    "This account's other acceptances of THIS policy, newest first."
    policy_history: [PolicyAcceptance!]!
    "Everything else this account has accepted, newest first. Capped at 50."
    user_acceptances: [PolicyAcceptance!]!
  }

  extend type Query {
    """
    The policies a new account must accept, in display order.

    PUBLIC and unauthenticated — the signup form is not signed in. Depends on no
    argument and no caller, which is why it is safe to response-cache.
    """
    signupPolicies: [Policy!]!
    """
    Auth-required: what the signed-in account has NOT accepted at the policy's
    CURRENT wording. A policy edited since they accepted comes back here.
    """
    myPendingPolicies: [Policy!]!
    "Legal: who accepted what, and when. Newest first."
    policyAcceptancesTable(query: TableQueryInput): PolicyAcceptanceTablePage!
    "Legal: everything behind one row of that log."
    policyAcceptanceDetail(acceptance_id: ID!): PolicyAcceptanceDetail!
  }

  extend type Mutation {
    """
    Auth-required: record acceptance from inside the account.

    For people who predate the gate and for re-accepting after an edit; signup
    acceptance rides RegisterInput / GoogleSignupInput instead, so it can be
    written in the same breath as the account.
    """
    acceptPolicies(policy_ids: [ID!]!, surface: PolicyAcceptanceSurface = UNKNOWN): Boolean!
  }
`;
