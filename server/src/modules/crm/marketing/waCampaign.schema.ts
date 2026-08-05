import gql from 'graphql-tag';

export const waCampaignTypeDefs = gql`
  "Who a WhatsApp campaign goes to. A newsletter subscriber has no phone number, so it is not an option here."
  enum WaCampaignAudience {
    ALL_USERS
    AUDIENCE_LIST
  }

  enum WaCampaignStatus {
    SENDING
    SENT
    FAILED
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

  type WaCampaignFailure {
    destination: String!
    reason: String!
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
    "How many people the audience resolved to at send time."
    recipient_count: Int!
    sent_count: Int!
    failed_count: Int!
    "Matched the audience but had no usable number or an empty variable."
    skipped_count: Int!
    "The first few failures, with the reason AiSensy gave."
    failures: [WaCampaignFailure!]!
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
  }

  extend type Mutation {
    createWaCampaignName(input: WaCampaignNameInput!): WaCampaignNameOption!
    deleteWaCampaignName(id: ID!): Boolean!
    "Start a WhatsApp send. Returns immediately; the walk continues in the background."
    sendWaCampaign(input: SendWaCampaignInput!): WaCampaign!
    deleteWaCampaign(campaign_id: ID!): Boolean!
  }
`;
