import gql from 'graphql-tag';

export const storeReleaseTypeDefs = gql`
  "Which store a release row or issue belongs to."
  enum ReleaseStore {
    APP_STORE
    GOOGLE_PLAY
  }

  """
  A store's state for a release, folded to what the table colours. Apple's
  version states and Play's track statuses each map onto these; the store's
  own word stays on the row as \`state\`.
  """
  enum StoreReleaseStatus {
    PREPARING
    WAITING
    IN_REVIEW
    APPROVED
    LIVE
    TESTING
    ROLLING_OUT
    HALTED
    REJECTED
    WITHDRAWN
    REPLACED
    REMOVED
    OTHER
  }

  "Why a release needed a person."
  enum ReleaseIssueKind {
    "The store said no."
    REJECTION
    "Approved, and waiting for someone here to press release."
    AWAITING_RELEASE
  }

  enum ReleaseIssueSource {
    "Read off the store's API — App Store Connect reports rejected states."
    STORE
    "Logged by an operator from the store's mail or console — the only way for Google Play."
    MANUAL
  }

  "What OpenAI advised about an issue, written from the store's state, the reviewer's message and the listing."
  type StoreReleaseAdvice {
    summary: String!
    causes: [String!]!
    steps: [String!]!
    next_time: [String!]!
    confidence: String!
    model: String!
    generated_at: String
    "Why there is no advice, when OpenAI could not answer. Empty otherwise."
    error: String!
  }

  """
  One moment a release needed a person: a rejection, or an approved version
  waiting to be released. Kept after the store has moved on, so the reason a
  version was refused is still readable beside the version that replaced it.
  """
  type StoreReleaseIssue {
    id: ID!
    store: ReleaseStore!
    kind: ReleaseIssueKind!
    source: ReleaseIssueSource!
    version: String!
    build_number: String!
    "The store's own word (METADATA_REJECTED, PENDING_DEVELOPER_RELEASE…), or MANUAL for a logged one."
    state: String!
    "Apple's review-submission state at the time. Empty on Play."
    review_state: String!
    """
    What the reviewer wrote. Neither store's API carries it — Apple keeps it in
    the Resolution Center, Google in the Play Console — so it is pasted here,
    and the advice is written again with it.
    """
    reviewer_message: String!
    store_ref: String!
    detected_at: String!
    "Who logged it, for a MANUAL issue."
    detected_by: String!
    resolved_at: String
    "STATE_CHANGED:<new state>, VERSION_GONE, or BY:<who> for a manual close."
    resolved_reason: String!
    advice: StoreReleaseAdvice
    notified_at: String
    "What went wrong sending the notices, when something did."
    notify_error: String!
    reminder_count: Int!
    last_reminded_at: String
    "The build pushed from the Releases page in answer to this issue, if any."
    resubmitted_build_no: String!
    resubmitted_by: String!
    resubmitted_at: String
  }

  """
  One release as the store shows it right now — an App Store version with its
  build and review state, or a Google Play track release with its version
  codes and rollout — plus the issue this server holds for it, when there is one.
  """
  type StoreReleaseRow {
    id: ID!
    store: ReleaseStore!
    version: String!
    "CFBundleVersion on Apple; the version code(s) on Play."
    build_number: String!
    "The store's own word for where the release is."
    state: String!
    status: StoreReleaseStatus!
    "Play's track. Empty on Apple."
    track: String!
    "Apple's review-submission state. Empty on Play."
    review_state: String!
    created_at: String
    submitted_at: String
    "Play's staged rollout percentage. Null when not staged."
    rollout_pct: Float
    store_ref: String!
    "The DUN-BLD row this build came from, when its build number matches one."
    build_no: String!
    issue: StoreReleaseIssue
  }

  "A store's releases, read live when asked. A store that cannot be read still answers, with its error."
  type StoreReleasePage {
    store: ReleaseStore!
    rows: [StoreReleaseRow!]!
    fetched_at: String!
    "The app's page on the store's console. Empty when the store could not be read."
    store_url: String!
    "The app's name on Apple; the package name on Play."
    app_name: String!
    "Whether the store's credentials are configured on the Environment page."
    configured: Boolean!
    "What the store answered when it refused. Empty when the read succeeded."
    error: String!
  }

  "Where release notices go, and how often an open issue is raised again."
  type StoreReleaseSettings {
    notify_enabled: Boolean!
    "Slack channel ID. Empty means no Slack post."
    slack_channel: String!
    mail_to: [String!]!
    reminders_enabled: Boolean!
    reminder_hours: Int!
    updated_by: String!
    updated_at: String
  }

  input UpdateStoreReleaseSettingsInput {
    notify_enabled: Boolean!
    slack_channel: String!
    mail_to: [String!]!
    reminders_enabled: Boolean!
    reminder_hours: Int!
  }

  input LogStoreRejectionInput {
    store: ReleaseStore!
    version: String!
    build_number: String
    "What the reviewer said, pasted from the store's mail or console."
    reviewer_message: String!
  }

  extend type Query {
    "One store's releases, live. Reading Apple also opens an issue for any newly rejected or awaiting version. Tech/Super admin only."
    storeReleases(store: ReleaseStore!): StoreReleasePage!
    storeReleaseSettings: StoreReleaseSettings!
  }

  extend type Mutation {
    updateStoreReleaseSettings(input: UpdateStoreReleaseSettingsInput!): StoreReleaseSettings!
    """
    Record a rejection the store's API could not report, with the reviewer's
    words. The advice is written at once and the notices go out. Tech/Super
    admin only.
    """
    logStoreRejection(input: LogStoreRejectionInput!): StoreReleaseIssue!
    "Keep the reviewer's message on an issue and write the advice again with it."
    setStoreIssueReviewerMessage(id: ID!, message: String!): StoreReleaseIssue!
    "Close an issue by hand — the reminders stop."
    resolveStoreIssue(id: ID!): StoreReleaseIssue!
    """
    Push the newest successful production build with a stored artifact to the
    store's review track — the same push as the Android / iOS tables, reached
    from the rejection so the retry is one click. Tech/Super admin only.
    """
    submitLatestBuildToStore(store: ReleaseStore!): AppBuild!
  }
`;
