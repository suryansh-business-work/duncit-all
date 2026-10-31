import gql from 'graphql-tag';

/** Marketing → Social → Inbox. Enum bodies are spelled out so codegen can read them. */
export const socialInboxTypeDefs = gql`
  "Where a comment stands in the Inbox: waiting, answered on the network, dealt with without a reply, or junk."
  enum SocialInboxStatus {
    OPEN
    REPLIED
    DONE
    SPAM
  }

  "The slice of the Inbox a summary card opens: open, open and flagged, open and nobody's, open and mine, or everything."
  enum SocialInboxView {
    OPEN
    FLAGGED
    UNASSIGNED
    MINE
    ALL
  }

  "One answer sent from the Inbox, kept whether the network took it or refused it."
  type SocialCommentReply {
    at: String
    by_user_id: String!
    by_name: String!
    text: String!
    "The reply's id on the network; empty when it was refused."
    external_id: String!
    ok: Boolean!
    "Why the network refused it; empty when it did not."
    error: String!
  }

  extend type SocialComment {
    status: SocialInboxStatus!
    "Who is working the comment; null when nobody is."
    assigned_user_id: ID
    assigned_name: String
    "Every reply sent from the Inbox, oldest first."
    replies: [SocialCommentReply!]!
    last_activity_at: String
  }

  type SocialInboxSummary {
    open: Int!
    "Open comments the AI flagged."
    flagged: Int!
    "Open comments nobody is working."
    unassigned: Int!
    "Open comments assigned to the person asking."
    mine: Int!
  }

  "Whether this integration can answer comments on a network, and the permission it would need when it cannot."
  type SocialReplyCapability {
    platform: SocialPlatform!
    can_reply: Boolean!
    missing_permission: String
    "The longest reply the network takes."
    max_length: Int!
  }

  "A drafted reply for a person to edit; never sent on its own."
  type SocialReplySuggestion {
    text: String!
    "The INBOX_REPLY run that drafted it, on Activity."
    run_id: ID!
  }

  extend type Query {
    "Every comment from every connected account, newest first; view pins a summary card's slice."
    socialInboxTable(query: TableQueryInput, view: SocialInboxView): SocialCommentTablePage!
    socialInboxSummary: SocialInboxSummary!
    socialReplyCapabilities: [SocialReplyCapability!]!
  }

  extend type Mutation {
    "Hand the comment to a person; a null user_id hands it back to nobody."
    assignSocialComment(id: ID!, user_id: ID): SocialComment!
    setSocialCommentStatus(id: ID!, status: SocialInboxStatus!): SocialComment!
    "Ask Claude for a draft reply. Nothing is sent: the person edits it and presses Send."
    suggestSocialReply(id: ID!): SocialReplySuggestion!
    "Answer the comment on its network. Refused with NOT_CONFIGURED, naming the permission, where the connection cannot reply."
    replyToSocialComment(id: ID!, text: String!): SocialComment!
  }
`;
