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
    "The date the member was promised, stamped from the window when they asked."
    scheduled_delete_at: String!
    "Whole days left before that date. Null once the request is closed."
    days_remaining: Int
    reviewed_at: String
    reviewed_by: ID
    note: String!
    purge_log: [AccountDeletionPurgeEntry!]!
  }

  "How long an account stays after its owner asks for it to go."
  type AccountDeletionSettings {
    retention_days: Int!
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
    pulled.
    REDACT_RECORDS — a financial or audit record that outlives the account. The
    row stays and the personal data on it is erased; what showed a name shows
    "Deleted user".
    The console shows this before it asks, because the three are not remotely
    the same act.
    """
    purge_kind: String!
    "Why this record is kept. Empty unless purge_kind is REDACT_RECORDS."
    retention_reason: String!
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
    """
    The retention window. Readable by any signed-in member, because both apps
    warn with the number BEFORE anyone confirms — a promise the product makes
    has to come from the same place the date is stamped from.
    """
    accountDeletionSettings: AccountDeletionSettings!
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
    """
    Change the retention window, in whole days (1–365).

    Applies to requests filed after it. A member already waiting keeps the date
    they were promised — moving somebody's deletion date under them is exactly
    what a grace period is supposed to prevent.
    """
    updateAccountDeletionSettings(retention_days: Int!): AccountDeletionSettings!
  }
`;
