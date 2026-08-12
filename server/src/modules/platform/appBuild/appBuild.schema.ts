import gql from 'graphql-tag';

export const appBuildTypeDefs = gql`
  enum AppBuildPlatform {
    ANDROID
    IOS
  }

  enum AppBuildStatus {
    SUCCESS
    FAILED
  }

  type AppBuildCommit {
    hash: String!
    subject: String!
    author: String!
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
    "The artifact's file name."
    build_name: String!
    "ImageKit CDN URL — the download link. Empty on a FAILED build."
    artifact_url: String!
    artifact_file_id: String!
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
  A one-shot ImageKit client-upload signature for a CI build artifact. The
  private key never leaves the server; CI posts the file straight to ImageKit
  (bypassing the server's upload body cap) with this signature.
  """
  type AppBuildUploadAuth {
    token: String!
    expire: Int!
    signature: String!
    public_key: String!
    "The ImageKit folder build artifacts land in."
    folder: String!
  }

  "Which Slack channels build announcements post to (stored on the SLACK env entry)."
  type AppBuildSettings {
    android_channel: String
    ios_channel: String
  }

  input AppBuildCommitInput {
    hash: String!
    subject: String!
    author: String
  }

  input ReportAppBuildInput {
    platform: AppBuildPlatform!
    "Defaults to SUCCESS. FAILED rows carry no artifact."
    status: AppBuildStatus
    version: String!
    build_name: String
    artifact_url: String
    artifact_file_id: String
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
    Record a finished CI build (and announce it on the platform's Slack
    channel, best-effort). Tech/Super admin only — the workflow authenticates
    with a TECH_MANAGER JWT, the same way release-notify does.
    """
    reportAppBuild(input: ReportAppBuildInput!): AppBuild!
    "Sign a direct-to-ImageKit upload for a build artifact. Tech/Super admin only."
    appBuildUploadAuth: AppBuildUploadAuth!
    updateAppBuildSettings(input: UpdateAppBuildSettingsInput!): AppBuildSettings!
  }
`;
