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

    This does NOT delete anything yet — the request is queued, and the account
    survives until the grace period is up. What it DOES do immediately is end
    the account: every token it has handed out stops being accepted, the live
    surfaces are told to sign out, and no door will mint it another one. The
    window is time for the decision to be reversed from the console, not time
    to keep using the account.

    Asking twice returns the request already open.
    """
    submitAccountDeletionRequest(
      input: SubmitAccountDeletionRequestInput!
    ): AccountDeletionRequest!
    """
    Withdraw an open request. The member's own, and only while it is open.

    No longer reachable from the apps: filing a request signs the member out
    and closes the account, so nobody holding an open request can be signed in
    to call this. \`rejectAccountDeletionRequest\` is the way back now.
    """
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

export const accountDeletionCronTypeDefs = /* GraphQL */ `
  enum AccountDeletionCronFrequency {
    DAILY
    WEEKLY
  }

  enum AccountDeletionRunStatus {
    RUNNING
    SUCCEEDED
    FAILED
  }

  enum AccountDeletionRunTrigger {
    SCHEDULED
    MANUAL
  }

  """
  The retention window AND the job that acts on it, as the Admin Panel sees it.

  Separate from \`AccountDeletionSettings\`, which any signed-in member may read
  because both apps quote the window before anybody confirms. When the sweep
  runs, how large a batch it takes and when it last fired are operational
  facts, not a promise made to a member.
  """
  type AccountDeletionCronSettings {
    "The grace period, in whole days. 30 is today's default, not a fixed rule."
    retention_days: Int!
    "False means the queue is cleared by hand, exactly as it was before."
    cron_enabled: Boolean!
    cron_frequency: AccountDeletionCronFrequency!
    "Wall-clock \`HH:mm\` in the platform timezone, not the container's UTC."
    cron_time_of_day: String!
    "0 = Sunday. Only read when the frequency is WEEKLY."
    cron_weekday: Int!
    "How many accounts one sweep will carry out. A ceiling, not a target."
    cron_batch_size: Int!
    last_run_at: String
    "Null while the sweep is off — there is no next run to name."
    next_run_at: String
  }

  "One account a sweep acted on, and what became of it."
  type AccountDeletionRunResult {
    request_id: String!
    user_id: ID!
    "The address as the request recorded it. The account itself is gone."
    email: String!
    "PURGED, or FAILED with the reason beside it."
    outcome: String!
    "Rows removed or redacted across every collection, for scale not detail."
    records: Int!
    error: String!
  }

  """
  One sweep of the deletion queue.

  Written whether or not anything was found: a run that deleted nobody is the
  evidence that the job is alive, and a night with no row at all is the thing
  worth noticing.
  """
  type AccountDeletionRun {
    id: ID!
    run_id: String!
    trigger: AccountDeletionRunTrigger!
    status: AccountDeletionRunStatus!
    "The moment eligibility was judged against."
    cutoff_at: String!
    retention_days: Int!
    "Due requests found. \`purged + failed\` may be fewer — the batch has a ceiling."
    eligible: Int!
    purged: Int!
    failed: Int!
    error: String!
    started_at: String!
    finished_at: String
    results: [AccountDeletionRunResult!]!
  }

  type AccountDeletionRunPage {
    rows: [AccountDeletionRun!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  """
  Every field is optional: the console saves the one card the operator touched
  rather than rewriting the whole schedule from a form it may have half-loaded.
  """
  input UpdateAccountDeletionCronInput {
    cron_enabled: Boolean
    cron_frequency: AccountDeletionCronFrequency
    "\`HH:mm\`. Refused if it cannot be parsed — a schedule nothing can read never fires."
    cron_time_of_day: String
    cron_weekday: Int
    cron_batch_size: Int
  }

  extend type Query {
    "Admin Panel: the window, the schedule, and when it last ran."
    accountDeletionCronSettings: AccountDeletionCronSettings!
    "How many requests are past their date right now — the console's preview."
    accountDeletionDueCount: Int!
    "The audit log: every sweep, newest first."
    accountDeletionRuns(query: TableQueryInput): AccountDeletionRunPage!
  }

  extend type Mutation {
    "Change when the sweep runs, and whether it runs at all."
    updateAccountDeletionCron(input: UpdateAccountDeletionCronInput!): AccountDeletionCronSettings!
    """
    Run the sweep now.

    Not gated on \`cron_enabled\` and does not move \`last_run_at\`: this is a
    human clearing the queue, and it must neither require switching the
    schedule on nor make tonight's run look like it already happened.
    """
    runAccountDeletionPurgeNow: AccountDeletionRun!
  }
`;
