import gql from 'graphql-tag';

export const appBuildTypeDefs = gql`
  enum AppBuildPlatform {
    ANDROID
    IOS
  }

  """
  RUNNING is written when the workflow STARTS and replaced in place when it
  finishes, so a build is visible while it is being made rather than only after.
  A row can sit RUNNING forever if the runner is cancelled or killed mid-job —
  nothing is left to report it — so treat an old RUNNING row as unknown, not live.
  """
  enum AppBuildStatus {
    RUNNING
    SUCCESS
    FAILED
  }

  type AppBuildCommit {
    hash: String!
    subject: String!
    author: String!
  }

  """
  What one build produced. Android emits two — an APK to sideload and an AAB to
  upload to Play — and they are ONE build, so they share a row rather than
  racing each other for the newest-first sort.
  """
  enum AppBuildArtifactKind {
    APK
    AAB
    IPA
  }

  type AppBuildArtifact {
    kind: AppBuildArtifactKind!
    "The artifact's file name."
    name: String!
    "The download link, served from the VPS build store. Empty if it never stored."
    url: String!
    "The handle it is removed by — its file name in the build store."
    file_id: String!
    size_mb: Float
    "Why this one is missing. Empty whenever there is a url."
    error: String!
  }

  """
  One CI build of the mobile app — made by the android-build / ios-build
  GitHub Actions workflows on every merge to main, uploaded to ImageKit and
  announced on Slack. The row is the store of record; Slack is a notification.
  """
  type AppBuild {
    id: ID!
    "Permanent human-readable id (DUN-BLD-000001)."
    build_no: String!
    platform: AppBuildPlatform!
    status: AppBuildStatus!
    version: String!
    """
    Everything this build produced: an APK and an AAB on Android, an IPA on iOS.
    Empty on a FAILED build. Rows written before builds shipped two artifacts
    report their single one here too, so this is always the whole answer.
    """
    artifacts: [AppBuildArtifact!]!
    "The primary artifact's file name (the APK on Android, the IPA on iOS)."
    build_name: String!
    """
    The primary artifact's download link, served from the VPS build store. Empty
    on a FAILED build, and on a SUCCESS build whose artifact could not be stored.
    Prefer the artifacts list — this names only the first of them.
    """
    artifact_url: String!
    "The handle the primary artifact is removed by — its file name in the build store."
    artifact_file_id: String!
    """
    Why a SUCCESS build has no download. Empty whenever there is one. A build
    that compiled but could not be stored is still reported and announced, so
    this is what tells the two apart.
    """
    artifact_error: String!
    """
    Why a FAILED build failed — the workflow stage that broke, and the runner's
    own message where there is one. Empty on every other status. A red row that
    cannot say what went wrong sends you to the GitHub log for a fact the row
    should already have.
    """
    error_message: String!
    size_mb: Float
    commit_sha: String!
    branch: String!
    "The commits this build shipped."
    commits: [AppBuildCommit!]!
    files_changed: Int
    insertions: Int
    deletions: Int
    workflow_run_id: String!
    workflow_run_url: String!
    duration_seconds: Int
    "Who the CI authenticated as when it reported the build."
    reported_by: String!
    slack_channel: String
    slack_ts: String
    "Why the Slack post did not happen, when it did not."
    slack_error: String
    created_at: String
  }

  type AppBuildTablePage {
    rows: [AppBuild!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  """
  A one-shot pass that lets CI hand a build artifact to the server, which then
  puts it on ImageKit. This used to be an ImageKit client-upload signature, so CI
  could post straight to ImageKit and skip the server body cap. A signature needs
  the public and private keys to be a matched pair from one account, and when they
  are not, ImageKit rejects the upload as an invalid signature parameter and says
  nothing about which key is wrong. The server uploads on the private key alone
  now, so there is no signature and no public key to mismatch.
  """
  type AppBuildUploadAuth {
    "POST the artifact here as multipart form-data, with the ticket in the query string."
    upload_url: String!
    "Single-use and short-lived. Spent by the upload, so it is worthless in a log."
    ticket: String!
    "The ImageKit folder build artifacts land in."
    folder: String!
  }

  "Which Slack channels build announcements post to (stored on the SLACK env entry)."
  type AppBuildSettings {
    android_channel: String
    ios_channel: String
    "When CI last reported any build. Null means the workflows have never reached us."
    last_reported_at: String
    "Which account the last report authenticated as."
    last_reported_by: String
  }

  """
  A credential for the build workflows, shown once and never stored.

  CI cannot read this database without already being authenticated, so one secret
  has to live in GitHub — that part is unavoidable. What is avoidable is
  hand-crafting the JWT: this mints one for the signed-in admin, with exactly
  their roles, so the Tech portal is where the credential comes from even though
  GitHub is where it is kept.
  """
  type AppBuildCiToken {
    token: String!
    "The GitHub Actions repo secret this belongs in."
    secret_name: String!
    "The account the token authenticates as."
    issued_for: String!
  }

  input AppBuildCommitInput {
    hash: String!
    subject: String!
    author: String
  }

  input AppBuildArtifactInput {
    kind: AppBuildArtifactKind!
    name: String!
    url: String
    file_id: String
    size_mb: Float
    "Why this one is missing — the build still counts as a success without it."
    error: String
  }

  input ReportAppBuildInput {
    platform: AppBuildPlatform!
    "Defaults to SUCCESS. FAILED rows carry no artifact."
    status: AppBuildStatus
    version: String!
    """
    Everything the build produced. When present this is the whole truth and the
    singular artifact_* fields below are ignored; those remain only so a reporter
    talking to a server that predates this list still lands its primary artifact.
    """
    artifacts: [AppBuildArtifactInput!]
    build_name: String
    artifact_url: String
    artifact_file_id: String
    """
    Why the artifact is missing on an otherwise successful build. Send this
    instead of failing the report: a build that compiled still deserves its row
    and its Slack post, and this is the line that explains the absent download.
    """
    artifact_error: String
    "Why the build failed. Ignored unless status is FAILED."
    error_message: String
    size_mb: Float
    commit_sha: String
    branch: String
    commits: [AppBuildCommitInput!]
    files_changed: Int
    insertions: Int
    deletions: Int
    workflow_run_id: String
    workflow_run_url: String
    duration_seconds: Int
  }

  input UpdateAppBuildSettingsInput {
    "Slack channel ID (e.g. C0123ABCD) Android builds announce to. Empty clears it."
    android_channel: String
    "Slack channel ID iOS builds announce to. Empty clears it."
    ios_channel: String
  }

  extend type Query {
    "CI builds of one platform, newest first (Tech portal App Builds tables)."
    appBuildsTable(platform: AppBuildPlatform!, query: TableQueryInput): AppBuildTablePage!
    appBuildSettings: AppBuildSettings!
  }

  extend type Mutation {
    """
    Record a CI build (and, once it finishes, announce it on the platform's
    Slack channel, best-effort). Tech/Super admin only — the workflow
    authenticates with a TECH_MANAGER JWT, the same way release-notify does.

    Reports are keyed on workflow_run_id, so the RUNNING report a workflow sends
    at its start and the SUCCESS/FAILED report it sends at its end are the SAME
    row, not two. Slack hears only about the finished one — a channel that
    announced every build twice would be ignored within a week.
    """
    reportAppBuild(input: ReportAppBuildInput!): AppBuild!
    "Authorise one build-artifact upload through the server. Tech/Super admin only."
    appBuildUploadAuth: AppBuildUploadAuth!
    """
    Mint a CI credential for the caller, to paste into the GitHub repo secret.
    Grants nothing the caller does not already hold — it re-signs their own
    identity — but it is audited, because a copyable long-lived token is worth
    knowing the origin of. Tech/Super admin only.
    """
    issueAppBuildCiToken: AppBuildCiToken!
    updateAppBuildSettings(input: UpdateAppBuildSettingsInput!): AppBuildSettings!
    """
    Delete a build and the artifact it points at. Tech/Super admin only.

    The stored file goes with the row — leaving it would fill the disk with
    artifacts nothing links to. An artifact that is already gone is not an
    error: the row must always be removable.
    """
    deleteAppBuild(id: ID!): Boolean!
  }
`;
