import gql from 'graphql-tag';

export const appReleaseTypeDefs = gql`
  input AppReleaseCommitInput {
    hash: String!
    subject: String!
    body: String
  }

  input SendAppReleaseEmailInput {
    version: String!
    build_name: String!
    apk_url: String!
    apk_size_mb: Float!
    commits: [AppReleaseCommitInput!]!
    range_label: String
    files_changed: Int
    insertions: Int
    deletions: Int
    "Optional override; defaults to the built-in release distribution list."
    recipients: [String!]
  }

  type AppReleaseEmailResult {
    ok: Boolean!
    message: String!
    recipients: [String!]!
    message_id: String
    changelog_html: String
  }

  extend type Mutation {
    """
    Emails the mobile-app release distribution list an APK download link plus an
    OpenAI-summarised changelog built from the supplied git commits. Tech/Super
    admin only; SMTP + OpenAI credentials come from the Tech portal env entries.
    """
    sendAppReleaseEmail(input: SendAppReleaseEmailInput!): AppReleaseEmailResult!
  }
`;
