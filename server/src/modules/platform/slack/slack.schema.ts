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

  """
  One message already posted in a channel. Authors arrive as ids, so the name
  and avatar are resolved from the workspace directory server-side — a client
  cannot do it without the bot token.
  """
  type SlackMessage {
    "Slack's own message id: the epoch-seconds timestamp it was posted at."
    ts: String!
    user_id: String!
    user_name: String!
    avatar: String!
    text: String!
    is_bot: Boolean!
    "Replies hanging off this message. Threads are read in Slack, not here."
    reply_count: Int!
  }

  "One thing the bot is, or is not, allowed to do."
  type SlackScope {
    "The Slack scope name, e.g. channels:history."
    scope: String!
    granted: Boolean!
    """
    False for scopes that only buy a convenience. A workspace can withhold one
    and everything else still works, so a missing optional scope is not a fault.
    """
    required: Boolean!
    "What stops working without it, in plain terms."
    purpose: String!
  }

  """
  What the installed bot token may actually do.

  Every Slack failure this portal can show is really a permissions question, and
  Slack answers it in a response HEADER that nobody can see. This is that header,
  turned into a list, plus the links to change it.
  """
  type SlackPermissions {
    "False when no bot token is configured at all."
    configured: Boolean!
    "The workspace the token belongs to. Empty when it could not be read."
    team: String!
    """
    False when Slack did not report the token's scopes. Every scope below is
    then unknown rather than ungranted — a token can work perfectly and still
    not say so, and rendering that as a column of red crosses would be a lie.
    """
    scopes_known: Boolean!
    scopes: [SlackScope!]!
    "Why the scopes could not be read, when they could not. Empty otherwise."
    error: String!
    "Where a workspace admin changes any of this."
    app_url: String!
    "Slack's own reference for what these scopes mean."
    docs_url: String!
  }

  extend type Query {
    """
    Recent messages in one channel, OLDEST FIRST.

    The bot must be a MEMBER of the channel — Slack refuses history for a
    channel it was never invited to, however many scopes the token holds.
    """
    slackChannelHistory(channel: ID!, limit: Int): [SlackMessage!]!
    "What the bot token is allowed to do, and where to change it."
    slackPermissions: SlackPermissions!
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
    "Screenshots the reporter attached — a picture of the broken screen is most of the report."
    media_urls: [String!]
    app_version: String
    "Device context — a bug report without it cannot be reproduced."
    device_os: String
    device_model: String
    "The screen the reporter was on when they opened the form."
    source_screen: String
  }

  extend type Mutation {
    "Post a message to a Slack channel (full message surface)."
    sendSlackMessage(input: SendSlackMessageInput!): SlackSendResult!
    """
    Add the bot to a PUBLIC channel, which is the fix for not_in_channel.

    Needs the channels:join scope. Private channels cannot be joined by any API
    — Slack only admits a bot to one by invitation from someone already inside
    it — so this refuses them rather than failing at Slack with a vaguer error.
    """
    joinSlackChannel(channel: ID!): SlackChannel!
    """
    File an in-app problem report. Any signed-in user; identity is server-stamped.

    The report is SAVED first and read in the Support portal; the Slack post is a
    notification whose failure is recorded on the row. It used to be Slack-only,
    so an unconfigured channel threw the report away.
    """
    submitAppFeedback(input: AppFeedbackInput!): SlackSendResult!
  }
`;
