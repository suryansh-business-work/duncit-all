import gql from 'graphql-tag';

export const aisensyTypeDefs = gql`
  type AisensyStatus {
    "Whether an AiSensy API key is configured (Tech portal → Environment Variables → AiSensy)."
    configured: Boolean!
    "Campaign name sends default to, from the AiSensy entry. Empty when unset."
    default_campaign: String!
  }

  type AisensySendResult {
    ok: Boolean!
    "AiSensy's queued-message id, echoed back so a delivery can be traced."
    submitted_message_id: String!
    message: String!
  }

  "One WhatsApp template campaign message. Every template parameter must be filled."
  input SendAisensyCampaignInput {
    "API campaign name exactly as it appears in AiSensy — falls back to the configured default."
    campaign_name: String
    "Country code + number, digits only (e.g. 919582998897)."
    destination: String!
    "Name AiSensy records for the contact."
    user_name: String!
    "Ordered template variables ({{1}}, {{2}}, …)."
    template_params: [String!]!
  }

  extend type Query {
    "AiSensy configuration state for the Tech portal."
    aisensyStatus: AisensyStatus!
  }

  extend type Mutation {
    "Send a WhatsApp template campaign message through AiSensy."
    sendAisensyCampaign(input: SendAisensyCampaignInput!): AisensySendResult!
  }
`;
