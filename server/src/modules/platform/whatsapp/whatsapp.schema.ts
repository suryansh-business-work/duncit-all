import gql from 'graphql-tag';

/**
 * Two audiences, one module.
 *
 * The ADMIN half is the console: every scenario Duncit can send, joined against
 * what AiSensy actually holds, with a switch per row and one global switch. The
 * USER half is the person's own opt-out, shaped exactly like
 * `MailPreference` so mWeb and the native app can be twins of the screens they
 * already ship (rule 27).
 *
 * Category LABELS are never sent — the server ships keys and both clients
 * localize them (rule 38).
 */
export const waAutomationTypeDefs = gql`
  "One automatic WhatsApp message, and whether AiSensy can actually deliver it."
  type WaScenario {
    "Stable id. Stored on every log row, so renaming a campaign never orphans history."
    event_key: String!
    campaign: String!
    audience: String!
    "Our consent category — billing, reminder, feedback… not Meta's."
    category: String!
    "What makes it fire, in a sentence."
    fires: String!
    "One label per placeholder, in order."
    params: [String!]!
    enabled: Boolean!
    "False for a ticket, a refund or an account change — those cannot be switched off."
    can_disable: Boolean!
    campaign_status: String!
    template_name: String!
    template_status: String!
    "Meta's category, which decides the per-message rate."
    template_category: String!
    "How many values the live template expects."
    template_params: Int!
    "The header asset the CAMPAIGN carries. Non-empty means every send must supply one."
    media_url: String!
    "The admin's own header asset. It wins over the campaign's; reconcile never touches it."
    override_media_url: String!
    override_media_filename: String!
    "Whether the template's header is an image, video or document every send must carry."
    needs_media: Boolean!
    "Why this cannot send right now. Empty when it can."
    blocker: String!
  }

  type WaScenarioBoard {
    "The kill switch. Off by default — nothing sends until somebody turns it on."
    global_enabled: Boolean!
    "False when AiSensy could not be read; the rows still render without live state."
    catalogue_ok: Boolean!
    catalogue_error: String!
    rows: [WaScenario!]!
  }

  type WaMessageLogRow {
    id: ID!
    event_key: String!
    campaign: String!
    category: String!
    audience: String!
    entity_id: String!
    recipient_user_id: ID
    destination: String!
    "SENDING, SENT, SKIPPED or FAILED."
    status: String!
    "Why it was skipped, or how it failed."
    reason: String!
    params: [String!]!
    """
    The header asset this message carried, as it went out. Blank on a text
    template — and blank on the send that came back "Media URL Missing", which
    is the failure it is here to make visible.
    """
    media_url: String!
    media_filename: String!
    submitted_message_id: String!
    template_category: String!
    msg_rate: Float!
    duration_ms: Int!
    created_at: String
  }

  "One switch on a person's own WhatsApp settings screen."
  type WaPreferenceCategory {
    category: String!
    required: Boolean!
    enabled: Boolean!
  }

  type WaPreference {
    destination: String!
    "False when there is no sendable number — the screen shows an 'add a number' state."
    reachable: Boolean!
    categories: [WaPreferenceCategory!]!
    updated_at: String
  }

  "A template submitted to Meta. It comes back PENDING; Meta decides."
  type AisensyTemplateDraft {
    name: String!
    status: String!
    reason: String!
  }

  type AisensyCampaignDraft {
    name: String!
    status: String!
    template_name: String!
  }

  input CreateAisensyTemplateInput {
    "Unique template name — this is also what a campaign binds to."
    name: String!
    "UTILITY, MARKETING or AUTHENTICATION."
    category: String!
    "The full language NAME AiSensy expects — English, Hindi — never a code."
    language: String!
    "TEXT, or IMAGE / VIDEO / FILE for a media header."
    type: String!
    "The body, with its {{1}} placeholders."
    body: String!
    "The same body with sample values in place — Meta reviews against this."
    sample: String!
    header_text: String
    footer_text: String
  }

  input CreateAisensyCampaignInput {
    template_name: String!
    campaign_name: String!
  }

  extend type Query {
    "Every automatic message, its switch, and what AiSensy holds for it."
    whatsappScenarios: WaScenarioBoard!
    "One send attempt in full — the detail behind a row of the merged WhatsApp log."
    whatsappMessageLog(id: ID!): WaMessageLogRow
    "The signed-in person's own WhatsApp switches."
    myWhatsappPreference: WaPreference!
  }

  extend type Mutation {
    "Flip one scenario. Pass __global__ as the key for the kill switch."
    setWhatsappScenarioEnabled(event_key: String!, enabled: Boolean!): WaScenarioBoard!
    "Re-read AiSensy and cache each template's category, which sets the rate."
    reconcileWhatsappScenarios: WaScenarioBoard!
    "Set the admin's own header asset for one scenario; an empty url clears it. Reconcile never overwrites it."
    setWhatsappScenarioMedia(event_key: String!, url: String!, filename: String): WaScenarioBoard!
    setMyWhatsappPreference(category: String!, enabled: Boolean!): WaPreference!
    setAllMyWhatsappPreferences(enabled: Boolean!): WaPreference!
    "Submit a new WhatsApp template straight to AiSensy. Nothing is stored here."
    createAisensyTemplate(input: CreateAisensyTemplateInput!): AisensyTemplateDraft!
    "Bind an approved template to a campaign name, which is what a send addresses."
    createAisensyCampaign(input: CreateAisensyCampaignInput!): AisensyCampaignDraft!
    "Remove a template. There is no edit — replacing one means delete and resubmit."
    deleteAisensyTemplate(template_id: ID!): Boolean!
  }
`;
