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

  "Who wrote a direct message: the person (IN) or the account (OUT)."
  enum SocialMessageDirection {
    IN
    OUT
  }

  "RECEIVED for an inbound message; an outbound one is SENT once the network took it, FAILED when it refused."
  enum SocialMessageStatus {
    RECEIVED
    SENT
    FAILED
  }

  "Meta's messaging window: OPEN within 24 h of the person's last message, HUMAN_AGENT (a person's reply only) up to 7 days, CLOSED after that or before they ever wrote."
  enum SocialWindowState {
    OPEN
    HUMAN_AGENT
    CLOSED
  }

  type SocialConversationParticipant {
    username: String!
    name: String!
    avatar_url: String!
  }

  "A direct-message conversation between a connected account and one person."
  type SocialConversation {
    id: ID!
    account_id: ID!
    account_name: String!
    platform: SocialPlatform!
    participant: SocialConversationParticipant!
    last_message_at: String
    "The person's last message, which the messaging window is measured from."
    last_inbound_at: String
    last_message_text: String!
    unread_count: Int!
    status: SocialInboxStatus!
    assigned_user_id: ID
    assigned_name: String
    ai_status: SocialAiStatus!
    ai_sentiment: SocialSentiment
    ai_severity: SocialSeverity
    "The person sent a stop keyword: no automated message goes to them."
    opted_out: Boolean!
    "The Instagram Leads lead this person was matched to."
    ig_lead_id: ID
    "The Marketing lead (Sequences) this person was matched to."
    marketing_lead_id: ID
    window_state: SocialWindowState!
    "When the current window state ends; null once closed."
    window_closes_at: String
  }

  type SocialConversationTablePage {
    rows: [SocialConversation!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type SocialMessageAttachment {
    type: String!
    url: String!
  }

  type SocialMessage {
    id: ID!
    direction: SocialMessageDirection!
    text: String!
    attachments: [SocialMessageAttachment!]!
    sent_at: String
    status: SocialMessageStatus!
    "Why the network refused it, in plain words; empty when it did not."
    error: String!
    sent_by_name: String!
    "Sent by an auto-reply rule, not a person."
    automated: Boolean!
    "HUMAN_AGENT when it went out on Meta's human-agent tag."
    tag: String!
  }

  "A conversation with its latest messages and what would stop a reply."
  type SocialConversationThread {
    conversation: SocialConversation!
    "Oldest first."
    messages: [SocialMessage!]!
    "The permission sending needs and this connection lacks; null when it has it."
    missing_permission: String
    "The longest message the network takes."
    max_length: Int!
  }

  "Marketing > Social > Settings. Meta's own rules (24-hour window, 7-day human-agent reply, no cold DMs) are not settings."
  type SocialSettings {
    "Hours between two scheduled reads of an account: the fallback when a webhook was missed (1-24)."
    sync_every_hours: Int!
    "Days of DM history read when an account is connected (0-90)."
    backfill_days: Int!
    "Days before a token expires that its owner is emailed (1-30)."
    expiry_alert_days: Int!
    "The AI rates every new comment and DM for sentiment and severity."
    auto_triage: Boolean!
    "An inbound DM from a lead's Instagram handle marks the lead Replied and stops its sequence."
    link_dms_to_leads: Boolean!
    "Who a new DM conversation is assigned to; null leaves it unassigned."
    default_assignee_user_id: ID
    "That person's name, for the Settings page."
    default_assignee_name: String
    "A DM that is exactly one of these opts the person out of every automated message."
    opt_out_keywords: [String!]!
    "A DM that is exactly one of these opts them back in."
    opt_in_keywords: [String!]!
    "The master switch for auto-reply rules."
    auto_reply_enabled: Boolean!
    "The most automated replies one account sends in a day (0-500)."
    auto_reply_daily_cap: Int!
    "An auto-reply waits in Approvals unless its rule is marked trusted."
    auto_reply_requires_approval: Boolean!
    "Brand-voice notes the AI follows when it drafts a reply (up to 2000 characters)."
    ai_reply_guidelines: String!
  }

  input SocialSettingsInput {
    sync_every_hours: Int!
    backfill_days: Int!
    expiry_alert_days: Int!
    auto_triage: Boolean!
    link_dms_to_leads: Boolean!
    default_assignee_user_id: ID
    opt_out_keywords: [String!]!
    opt_in_keywords: [String!]!
    auto_reply_enabled: Boolean!
    auto_reply_daily_cap: Int!
    auto_reply_requires_approval: Boolean!
    ai_reply_guidelines: String!
  }

  "A tab of the comment queue: every network's comments, or Threads replies on their own."
  enum SocialInboxChannel {
    COMMENTS
    THREADS_REPLIES
  }

  "What a row of the Inbox's All tab is."
  enum SocialInboxItemKind {
    COMMENT
    THREADS_REPLY
    DM
  }

  "One row of the All tab: a comment, a Threads reply or a DM conversation."
  type SocialInboxItem {
    "The comment's or the conversation's id, by kind."
    id: ID!
    kind: SocialInboxItemKind!
    platform: SocialPlatform!
    account_id: ID!
    account_name: String!
    author: String!
    "The comment, or the conversation's latest message."
    text: String!
    status: SocialInboxStatus!
    ai_sentiment: SocialSentiment
    ai_severity: SocialSeverity
    assigned_name: String
    at: String
    unread_count: Int!
  }

  type SocialInboxItemTablePage {
    rows: [SocialInboxItem!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "A lead made from a conversation, and whether it matched one already in the pipeline."
  type SocialConversationLead {
    thread: SocialConversationThread!
    lead_id: ID!
    merged: Boolean!
  }

  extend type SocialAccount {
    "The messaging permission this connection lacks (Instagram and Facebook); null when it has it or the network has no DMs here."
    messaging_missing_permission: String
    "Why the last DM read failed; empty when it did not."
    dm_error: String!
    "Why subscribing the Page to webhooks failed; empty when it did not."
    webhook_error: String!
  }

  "What an auto-reply rule answers: a whole-message keyword, a phrase anywhere (FAQ), a person's first DM (WELCOME), or a phrase in a comment, answered with one private reply (COMMENT_TO_DM)."
  enum SocialAutoReplyKind {
    KEYWORD
    FAQ
    WELCOME
    COMMENT_TO_DM
  }

  "A rule that answers inbound DMs or comments on its own, inside Meta's 24-hour window, never to someone who opted out, under the daily cap."
  type SocialAutoReplyRule {
    id: ID!
    name: String!
    kind: SocialAutoReplyKind!
    "Upper-cased words or phrases; empty for WELCOME."
    keywords: [String!]!
    reply_text: String!
    "The accounts it answers for; empty means every connected Facebook and Instagram account."
    account_ids: [ID!]!
    "A trusted rule sends at once even when Social Settings asks for approval."
    trusted: Boolean!
    enabled: Boolean!
    "Replies it sent in the last 7 days."
    sent_7d: Int!
    updated_at: String
  }

  type SocialAutoReplyRuleTablePage {
    rows: [SocialAutoReplyRule!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input SocialAutoReplyRuleInput {
    name: String!
    kind: SocialAutoReplyKind!
    keywords: [String!]!
    reply_text: String!
    account_ids: [ID!]!
    trusted: Boolean!
    enabled: Boolean!
  }

  extend type Query {
    "Every comment from every connected account, newest first; view pins a summary card's slice."
    socialInboxTable(query: TableQueryInput, view: SocialInboxView, channel: SocialInboxChannel): SocialCommentTablePage!
    "Comments, Threads replies and DM conversations as one queue, newest first (the All tab)."
    socialInboxItemsTable(query: TableQueryInput, view: SocialInboxView): SocialInboxItemTablePage!
    socialInboxSummary: SocialInboxSummary!
    socialReplyCapabilities: [SocialReplyCapability!]!
    "Every DM conversation from every connected account, latest first; view pins a summary card's slice."
    socialConversationsTable(query: TableQueryInput, view: SocialInboxView): SocialConversationTablePage!
    socialConversation(id: ID!): SocialConversationThread!
    "One comment as the Inbox shows it, for opening a row of the All tab."
    socialInboxComment(id: ID!): SocialComment!
    "Open, flagged, unassigned and mine, for DMs."
    socialDmSummary: SocialInboxSummary!
    socialSettings: SocialSettings!
    "The URL Meta delivers webhooks to, for the app's Webhooks setup."
    socialWebhookUrl: String!
    "The auto-reply rules, most recently changed first."
    socialAutoReplyRulesTable(query: TableQueryInput): SocialAutoReplyRuleTablePage!
  }

  extend type Mutation {
    "Hand the comment to a person; a null user_id hands it back to nobody."
    assignSocialComment(id: ID!, user_id: ID): SocialComment!
    setSocialCommentStatus(id: ID!, status: SocialInboxStatus!): SocialComment!
    "Ask Claude for a draft reply. Nothing is sent: the person edits it and presses Send."
    suggestSocialReply(id: ID!): SocialReplySuggestion!
    "Answer the comment on its network. Refused with NOT_CONFIGURED, naming the permission, where the connection cannot reply."
    replyToSocialComment(id: ID!, text: String!): SocialComment!
    "Send a direct message. Refused with WINDOW_CLOSED outside Meta's window, NOT_CONFIGURED without the messaging permission or a linked Page."
    sendSocialMessage(id: ID!, text: String!): SocialConversationThread!
    "Ask the AI for a draft direct message. Nothing is sent: the person edits it and presses Send."
    suggestSocialMessage(id: ID!): SocialReplySuggestion!
    assignSocialConversation(id: ID!, user_id: ID): SocialConversationThread!
    setSocialConversationStatus(id: ID!, status: SocialInboxStatus!): SocialConversationThread!
    markSocialConversationRead(id: ID!): SocialConversationThread!
    updateSocialSettings(input: SocialSettingsInput!): SocialSettings!
    "Put the person into the Marketing pipeline (matched by Instagram handle) and link the conversation to the lead."
    createLeadFromSocialConversation(id: ID!): SocialConversationLead!
    "Add an auto-reply rule. Refused with BAD_USER_INPUT for a keyword that is a stop or start keyword, or an account that cannot message."
    createSocialAutoReplyRule(input: SocialAutoReplyRuleInput!): SocialAutoReplyRule!
    updateSocialAutoReplyRule(id: ID!, input: SocialAutoReplyRuleInput!): SocialAutoReplyRule!
    "Delete a rule. The replies it already made stay in Activity."
    deleteSocialAutoReplyRule(id: ID!): Boolean!
  }
`;
