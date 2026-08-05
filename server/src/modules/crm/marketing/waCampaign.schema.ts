import gql from 'graphql-tag';

export const waCampaignTypeDefs = gql`
  "Who a WhatsApp campaign goes to. A newsletter subscriber has no phone number, so it is not an option here."
  enum WaCampaignAudience {
    ALL_USERS
    AUDIENCE_LIST
  }

  enum WaCampaignStatus {
    "Waiting for its hour — still cancellable."
    SCHEDULED
    SENDING
    SENT
    FAILED
    "Called off before it ran — never the same fact as one that ran and failed."
    CANCELLED
  }

  "An AiSensy campaign name marketing may pick. AiSensy cannot list these, so the list is maintained here."
  type WaCampaignNameOption {
    id: ID!
    name: String!
    description: String!
  }

  "A variable a template parameter may carry, resolved per recipient."
  type WaCampaignVariable {
    "Write it as {{name}} inside a template parameter."
    name: String!
    description: String!
  }

  "What happened to one person in a send. SKIPPED means nothing was attempted for them."
  enum WaRecipientStatus {
    SENT
    SKIPPED
    FAILED
  }

  "One person the send walked over — the answer to who it reached and who it did not."
  type WaCampaignRecipient {
    id: ID!
    name: String!
    destination: String!
    status: WaRecipientStatus!
    "Why they were skipped, or the reason AiSensy refused. Empty when sent."
    reason: String!
    "AiSensy's own id for the queued message — the trace back to their side."
    submitted_message_id: String!
    "The template variables as they were filled for this person."
    template_params: [String!]!
    created_at: String
  }

  type WaCampaignRecipientPage {
    rows: [WaCampaignRecipient!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type WaCampaign {
    campaign_id: ID!
    name: String!
    "The AiSensy campaign/template this send used."
    wa_campaign_name: String!
    audience: WaCampaignAudience!
    audience_list_id: ID
    template_params: [String!]!
    status: WaCampaignStatus!
    "When a scheduled send is due. Null for one that went out immediately."
    scheduled_at: String
    "How many people the audience resolved to at send time."
    recipient_count: Int!
    sent_count: Int!
    failed_count: Int!
    "Matched the audience but had no usable number or an empty variable."
    skipped_count: Int!
    error: String
    sent_at: String
    created_at: String
    updated_at: String
  }

  type WaCampaignTablePage {
    rows: [WaCampaign!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "An API campaign as AiSensy has it — read through the Project API, not stored here."
  type AisensyCampaign {
    name: String!
    status: String!
    "The WhatsApp template this campaign sends."
    template_name: String!
    type: String!
  }

  "A WhatsApp message template as AiSensy has it."
  type AisensyTemplate {
    name: String!
    status: String!
    category: String!
    language: String!
    "The template's BODY text, with its {{1}} placeholders intact."
    body: String!
    "How many variables the body expects — the number of params a send must fill."
    param_count: Int!
  }

  input WaCampaignNameInput {
    name: String!
    description: String
  }

  input SendWaCampaignInput {
    "Internal name for this send."
    name: String!
    "Must be one of the saved WhatsApp campaign names."
    wa_campaign_name: String!
    audience: WaCampaignAudience!
    "AUDIENCE_LIST audience only — the saved Target Audience list."
    audience_list_id: ID
    "Ordered template variables — literal text, or {{first_name}} style tokens."
    template_params: [String!]!
    "ISO time to send at. Absent, or already past, sends immediately."
    scheduled_at: String
  }

  extend type Query {
    "Whether the Tech portal's AiSensy API key is configured."
    waCampaignConfigured: Boolean!
    "The AiSensy campaign names marketing may send."
    waCampaignNames: [WaCampaignNameOption!]!
    "Variables a template parameter may use."
    waCampaignVariables: [WaCampaignVariable!]!
    "How many people this audience reaches on WhatsApp right now."
    waCampaignReach(audience: WaCampaignAudience!, audience_list_id: ID): Int!
    waCampaignsTable(query: TableQueryInput): WaCampaignTablePage!
    "One campaign in full — the detail view behind a table row."
    waCampaign(campaign_id: ID!): WaCampaign!
    "Everyone that campaign walked over, with what happened to each."
    waCampaignRecipients(campaign_id: ID!, query: TableQueryInput): WaCampaignRecipientPage!
    "Whether the Tech portal holds the AiSensy Project credentials that read campaigns and templates."
    aisensyProjectConfigured: Boolean!
    "The API campaigns AiSensy has for this project."
    aisensyCampaigns: [AisensyCampaign!]!
    "The WhatsApp message templates AiSensy has for this project."
    aisensyTemplates: [AisensyTemplate!]!
  }

  extend type Mutation {
    createWaCampaignName(input: WaCampaignNameInput!): WaCampaignNameOption!
    deleteWaCampaignName(id: ID!): Boolean!
    "Start or schedule a WhatsApp send. Returns immediately; the walk continues in the background."
    sendWaCampaign(input: SendWaCampaignInput!): WaCampaign!
    "Call off a scheduled send before it runs."
    cancelWaCampaign(campaign_id: ID!): WaCampaign!
    deleteWaCampaign(campaign_id: ID!): Boolean!
  }
`;
