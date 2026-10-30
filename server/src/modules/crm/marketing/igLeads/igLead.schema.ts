import gql from 'graphql-tag';

export const igLeadTypeDefs = gql`
  "Where the conversation with an Instagram lead stands."
  enum IgLeadStatus {
    NEW
    CONTACTED
    REPLIED
    CONVERTED
    LOST
  }

  enum IgLeadSearchStatus {
    RUNNING
    DONE
    FAILED
  }

  "One DM the marketer sent. Step 0 is the opener; 1, 2 … are the follow-ups."
  type IgLeadMessage {
    step: Int!
    text: String!
    sent_at: String
  }

  "A public Instagram business or creator profile found by a lead search."
  type IgLead {
    id: ID!
    username: String!
    name: String!
    bio: String!
    website: String!
    followers: Int
    media_count: Int
    profile_picture_url: String!
    profile_url: String!
    "Emails and phones the profile published in its bio or Google's snippet of it."
    emails: [String!]!
    phones: [String!]!
    "0-100 against the brief it was found for; null when it could not be scored."
    fit_score: Int
    fit_reason: String!
    status: IgLeadStatus!
    "The AI's draft of the next message, and which step it is for."
    draft: String!
    draft_step: Int
    messages: [IgLeadMessage!]!
    next_follow_up_at: String
    last_contacted_at: String
    replied_at: String
    created_at: String
  }

  type IgLeadTablePage {
    rows: [IgLead!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "One run of a brief: the searches the AI planned and how many profiles came of it."
  type IgLeadSearch {
    id: ID!
    brief: String!
    max_results: Int!
    summary: String!
    queries: [String!]!
    status: IgLeadSearchStatus!
    found: Int!
    added: Int!
    skipped: Int!
    error: String!
    created_at: String
    finished_at: String
  }

  type IgLeadSettings {
    max_follow_ups: Int!
    follow_up_gap_days: Int!
    daily_send_limit: Int!
    "What Duncit is offering these leads; every DM is written around it."
    pitch: String!
    sent_today: Int!
    "Whether a Serper key is set (Tech → Environment Variables, or these settings)."
    serper_ready: Boolean!
    "Whether an Instagram business account is connected in Social Accounts."
    instagram_ready: Boolean!
  }

  input IgLeadSearchInput {
    "The kind of leads wanted, in the marketer's own words."
    brief: String!
    max_results: Int
  }

  input IgLeadSettingsInput {
    max_follow_ups: Int!
    follow_up_gap_days: Int!
    daily_send_limit: Int!
    pitch: String!
  }

  extend type Query {
    "Instagram leads, server-paged. due: true keeps only those with a follow-up due now."
    igLeadsTable(query: TableQueryInput, due: Boolean): IgLeadTablePage!
    "The latest lead searches, newest first."
    igLeadSearches: [IgLeadSearch!]!
    igLeadSettings: IgLeadSettings!
  }

  extend type Mutation {
    "Start a lead search in the background; poll igLeadSearches for its progress."
    startIgLeadSearch(input: IgLeadSearchInput!): IgLeadSearch!
    "Have the AI draft the lead's next DM (opener or follow-up)."
    draftIgLeadMessage(id: ID!): IgLead!
    "Record a DM the marketer is sending from Instagram; schedules the next follow-up."
    markIgLeadSent(id: ID!, text: String!): IgLead!
    setIgLeadStatus(id: ID!, status: IgLeadStatus!): IgLead!
    deleteIgLead(id: ID!): Boolean!
    updateIgLeadSettings(input: IgLeadSettingsInput!): IgLeadSettings!
  }
`;
