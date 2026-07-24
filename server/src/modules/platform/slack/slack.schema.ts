import gql from 'graphql-tag';

export const slackTypeDefs = gql`
  type SlackChannel {
    id: ID!
    name: String!
    is_private: Boolean!
    is_member: Boolean!
    num_members: Int!
    topic: String!
    "Deep archive link to the channel — copy/share to reach it in Slack."
    link: String!
  }

  type SlackSendResult {
    ok: Boolean!
    channel: String!
    ts: String!
  }

  "Post a message — supports the full Slack message surface. Provide at least one of text/blocks/attachments."
  input SendSlackMessageInput {
    "Channel ID (e.g. C0123ABCD) — defaults to the configured default channel."
    channel: String
    text: String
    "JSON array of Block Kit blocks (stringified)."
    blocks_json: String
    "JSON array of legacy attachments (stringified)."
    attachments_json: String
    "Reply in a thread (the parent message's ts)."
    thread_ts: String
    reply_broadcast: Boolean
    mrkdwn: Boolean
    unfurl_links: Boolean
    unfurl_media: Boolean
    link_names: Boolean
    icon_emoji: String
    username: String
  }

  extend type Query {
    "Whether a Slack bot token is configured (Tech portal)."
    slackConfigured: Boolean!
    "Channels the Slack bot can see, each with a copyable archive link."
    slackChannels: [SlackChannel!]!
  }

  """
  In-app feedback / problem report from any signed-in user. The server stamps
  the authenticated identity and routes it to the feedback channel.
  """
  input AppFeedbackInput {
    "Bug | Idea | Question | Other (free-form, shown as a label)."
    category: String!
    message: String!
    "Where it was sent from — 'web' | 'ios' | 'android' (labelling only)."
    platform: String
    "JSON array of Block Kit blocks (stringified) the client composed for the body."
    blocks_json: String
  }

  extend type Mutation {
    "Post a message to a Slack channel (full message surface)."
    sendSlackMessage(input: SendSlackMessageInput!): SlackSendResult!
    "Post in-app feedback to Slack. Any signed-in user; identity is server-stamped."
    submitAppFeedback(input: AppFeedbackInput!): SlackSendResult!
  }
`;
