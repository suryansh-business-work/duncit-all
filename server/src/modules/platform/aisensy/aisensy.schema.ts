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

  """
  The header asset a media template sends — the image, video or document above
  the message. AiSensy fetches the URL itself at send time, so it must be
  reachable from the public internet.
  """
  type AisensyMedia {
    url: String!
    filename: String!
  }

  input AisensyMediaInput {
    "Public URL of the image, video or document."
    url: String!
    "File name WhatsApp shows on a document. Optional for an image or a video."
    filename: String
  }

  """
  What fills a CTA button's dynamic link. It travels in its own field and never
  as a template parameter — a template_params of the wrong length is refused.
  """
  type AisensyButton {
    "Where the button sits on the template, counting from zero."
    index: Int!
    value: String!
  }

  input AisensyButtonInput {
    "The button's position in the template's cta_buttons, counting from zero."
    index: Int!
    "What replaces the {{n}} in that button's link."
    value: String!
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
    "The header asset — required by every template whose header is IMAGE, VIDEO or FILE."
    media: AisensyMediaInput
    "Values for CTA buttons whose link carries a {{n}}."
    buttons: [AisensyButtonInput!]
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
