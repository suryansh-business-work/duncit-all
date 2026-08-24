export const accountDeletionTypeDefs = /* GraphQL */ `
  enum AccountDeletionStatus {
    PENDING
    COMPLETED
    CANCELLED
    REJECTED
  }

  enum AccountDeletionSurface {
    MWEB
    APP
    UNKNOWN
  }

  "One collection cleared while carrying a request out, and when."
  type AccountDeletionPurgeEntry {
    model_name: String!
    collection_name: String!
    field_path: String!
    removed: Int!
    purged_at: String!
  }

  """
  A member asking to be removed.

  The identity fields are a SNAPSHOT taken when they asked, not a join onto
  the account — carrying the request out destroys the account, and a finished
  row that can no longer say who it was about is a useless record.
  """
  type AccountDeletionRequest {
    id: ID!
    request_id: String!
    user_id: ID!
    name: String!
    email: String!
    phone: String!
    reason: String!
    surface: AccountDeletionSurface!
    status: AccountDeletionStatus!
    requested_at: String!
    reviewed_at: String
    reviewed_by: ID
    note: String!
    purge_log: [AccountDeletionPurgeEntry!]!
  }

  """
  One place this member still appears, found by reading the schemas rather
  than a hand-kept list — so a collection added next week is covered without
  anyone remembering to register it.
  """
  type AccountDeletionTraceGroup {
    "The mongoose model, e.g. \`Ticket\`."
    model_name: String!
    "The underlying collection, which is what a DB console shows."
    collection_name: String!
    "The field pointing at the member, e.g. \`pod_attendees\`."
    field_path: String!
    "Whether the stored value is an ObjectId or a stringified id."
    id_kind: String!
    "How many documents match right now."
    count: Int!
    """
    What clearing this does.

    DELETE_DOCUMENTS — the documents are the member's and go entirely.
    REMOVE_FROM_DOCUMENTS — the member is one entry inside somebody else's
    document (a pod attendee, a comment, a signature), so only their entry is
    pulled. The console shows this before it asks, because the two are not
    remotely the same act.
    """
    purge_kind: String!
  }

  type AccountDeletionDetail {
    request: AccountDeletionRequest!
    "False once the account document itself has been removed."
    account_exists: Boolean!
    "Only the references that still match something; a cleared one drops out."
    trace: [AccountDeletionTraceGroup!]!
  }

  type AccountDeletionRequestPage {
    rows: [AccountDeletionRequest!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input SubmitAccountDeletionRequestInput {
    "The 6-digit code from requestAccountDeletionOtp."
    otp: String!
    "Optional: why they are leaving. Shown to whoever reviews it."
    reason: String
    surface: AccountDeletionSurface
  }

  input PurgeAccountTraceInput {
    request_doc_id: ID!
    model_name: String!
    field_path: String!
  }

  extend type Query {
    "The signed-in member's own open request, or null."
    myAccountDeletionRequest: AccountDeletionRequest
    "Tech console queue."
    accountDeletionRequestsTable(query: TableQueryInput): AccountDeletionRequestPage!
    "One request plus a live count of where that member still appears."
    accountDeletionRequest(request_doc_id: ID!): AccountDeletionDetail!
  }

  extend type Mutation {
    """
    Ask for the account to be removed.

    This does NOT delete anything. It files a request for the Tech portal and
    leaves the account fully usable, so a mis-tap costs nothing and the member
    can withdraw it. Asking twice returns the request already open.
    """
    submitAccountDeletionRequest(
      input: SubmitAccountDeletionRequestInput!
    ): AccountDeletionRequest!
    "Withdraw an open request. The member's own, and only while it is open."
    cancelMyAccountDeletionRequest: AccountDeletionRequest!
    "Clear this member's rows behind ONE reference. Permanent."
    purgeAccountTrace(input: PurgeAccountTraceInput!): AccountDeletionDetail!
    """
    Clear every remaining trace and then the account itself. Permanent.

    The account goes last: a run that dies halfway leaves a request that still
    names a user the next attempt can search by.
    """
    purgeAccountCompletely(request_doc_id: ID!): AccountDeletionDetail!
    "Turn a request down, with a reason."
    rejectAccountDeletionRequest(request_doc_id: ID!, note: String!): AccountDeletionDetail!
  }
`;
