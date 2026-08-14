import gql from 'graphql-tag';

export const waCampaignTypeDefs = gql`
  "Who a WhatsApp campaign goes to. A newsletter subscriber has no phone number, so it is not an option here."
  enum WaCampaignAudience {
    ALL_USERS
    AUDIENCE_LIST
    "Accounts picked one by one — their saved WhatsApp number is used."
    SPECIFIC_USERS
    "Numbers typed in, which may belong to nobody with an account."
    MANUAL_NUMBERS
  }

  "One typed-in recipient. The country code is its own field so it is never guessed."
  type WaManualContact {
    name: String!
    extension: String!
    number: String!
  }

  input WaManualContactInput {
    name: String!
    extension: String!
    number: String!
  }

  "An account the 'send to these people' picker offers — one that carries a usable number."
  type WaUserOption {
    id: ID!
    name: String!
    "Country code + number, digits only, exactly as AiSensy would be given it."
    destination: String!
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
    "How many times the send has been attempted for this person (a retry updates the row)."
    attempts: Int!
    created_at: String
    updated_at: String
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
    "SPECIFIC_USERS only — the accounts that were picked."
    user_ids: [ID!]!
    "MANUAL_NUMBERS only — the numbers this send was given."
    contacts: [WaManualContact!]!
    "The template behind the campaign, as AiSensy had it when this send was created."
    template_name: String!
    "MARKETING, UTILITY, AUTHENTICATION or SERVICE — empty when AiSensy never said."
    template_category: String!
    "The per-message rate frozen at send time. A later price change never moves it."
    msg_rate: Float!
    "msg_rate × sent_count — what the messages that actually went out cost."
    cost: Float!
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
    "AiSensy's own id — the only handle deleteAisensyTemplate accepts."
    id: ID!
    name: String!
    status: String!
    category: String!
    language: String!
    "The template's BODY text, with its {{1}} placeholders intact."
    body: String!
    "How many variables the body expects — the number of params a send must fill."
    param_count: Int!
    "The HEADER component's text — empty for a media header or no header."
    header: String!
    "TEXT, IMAGE, VIDEO or DOCUMENT — empty when the template has no header."
    header_format: String!
    "The small grey line under the body, when the template has one."
    footer: String!
    "The button labels WhatsApp draws under the message, in order."
    buttons: [String!]!
  }

  type WaTestSendResult {
    ok: Boolean!
    "AiSensy's own id for the queued message."
    submitted_message_id: String!
    message: String!
  }

  "One test message to one number — the check before pointing a template at an audience."
  input SendWaTestInput {
    wa_campaign_name: String!
    "Country code + number, digits only (e.g. 919582998897)."
    destination: String!
    user_name: String!
    template_params: [String!]!
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
    "SPECIFIC_USERS audience only — the accounts to send to."
    user_ids: [ID!]
    "MANUAL_NUMBERS audience only — the numbers to send to."
    contacts: [WaManualContactInput!]
    "Ordered template variables — literal text, or {{first_name}} style tokens."
    template_params: [String!]!
    "ISO time to send at. Absent, or already past, sends immediately."
    scheduled_at: String
  }

  "What a WhatsApp message costs, by the category Meta bills on."
  type WaPricing {
    marketing_per_msg: Float!
    utility_per_msg: Float!
    authentication_per_msg: Float!
    "Service conversations are free today — a rate is kept so that can change without a deploy."
    service_per_msg: Float!
    currency_symbol: String!
  }

  input UpdateWaPricingInput {
    marketing_per_msg: Float!
    utility_per_msg: Float!
    authentication_per_msg: Float!
    service_per_msg: Float!
    currency_symbol: String!
  }

  "What one category cost over the window."
  type WaDashboardCategory {
    "MARKETING, UTILITY, AUTHENTICATION, SERVICE — or empty for sends AiSensy never categorised."
    category: String!
    campaigns: Int!
    messages: Int!
    failed: Int!
    skipped: Int!
    cost: Float!
  }

  "A send worth looking at first — the ones that cost the most."
  type WaDashboardCampaign {
    campaign_id: ID!
    name: String!
    wa_campaign_name: String!
    template_category: String!
    messages: Int!
    cost: Float!
    status: WaCampaignStatus!
    sent_at: String
  }

  "What WhatsApp cost and reached over a window. Every figure uses the rate each send froze."
  type WaDashboard {
    currency_symbol: String!
    campaigns: Int!
    messages_sent: Int!
    messages_failed: Int!
    messages_skipped: Int!
    total_cost: Float!
    by_category: [WaDashboardCategory!]!
    top_campaigns: [WaDashboardCampaign!]!
  }

  extend type Query {
    "Whether the Tech portal's AiSensy API key is configured."
    waCampaignConfigured: Boolean!
    "The AiSensy campaign names marketing may send."
    waCampaignNames: [WaCampaignNameOption!]!
    "Variables a template parameter may use."
    waCampaignVariables: [WaCampaignVariable!]!
    "How many messages this recipient list would actually produce right now."
    waCampaignReach(
      audience: WaCampaignAudience!
      audience_list_id: ID
      user_ids: [ID!]
      contacts: [WaManualContactInput!]
    ): Int!
    "Accounts the 'send to these people' picker offers, matched on name, email or number."
    waCampaignUserSearch(search: String!): [WaUserOption!]!
    "What a WhatsApp message costs, by category."
    waPricing: WaPricing!
    "What WhatsApp cost and reached over a window (ISO dates; absent means all time)."
    waCampaignDashboard(from: String, to: String): WaDashboard!
    waCampaignsTable(query: TableQueryInput): WaCampaignTablePage!
    "One campaign in full — the detail view behind a table row."
    waCampaign(campaign_id: ID!): WaCampaign!
    "Everyone that campaign walked over, with what happened to each."
    waCampaignRecipients(campaign_id: ID!, query: TableQueryInput): WaCampaignRecipientPage!
    "The whole recipient list as CSV — every row, not one page."
    waCampaignRecipientsCsv(campaign_id: ID!): String!
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
    "Re-attempt only the people this campaign did not reach. Returns immediately."
    retryWaCampaign(campaign_id: ID!): WaCampaign!
    "Send one test message to one number, through the same path a campaign uses."
    sendWaTestMessage(input: SendWaTestInput!): WaTestSendResult!
    deleteWaCampaign(campaign_id: ID!): Boolean!
    "Change the rate card. Applies to sends made from now on — past sends keep the rate they froze."
    updateWaPricing(input: UpdateWaPricingInput!): WaPricing!
  }
`;
