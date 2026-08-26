import { gql } from '@apollo/client';
import type { WaMediaRef } from '@duncit/communication';

const WA_CAMPAIGN_FIELDS = `
  campaign_id name wa_campaign_name audience audience_list_id template_params
  user_ids contacts { name extension number }
  template_name template_category msg_rate cost
  media { url filename }
  status scheduled_at recipient_count sent_count failed_count skipped_count
  error sent_at created_at updated_at
`;

/** Everything the page needs before the first render: whether the Tech portal's
 * AiSensy key is in place, the campaign names to pick from, the variables a
 * parameter may use, and the saved audience lists. */
export const WA_CAMPAIGN_SETUP = gql`
  query WaCampaignSetup {
    waCampaignConfigured
    waCampaignNames {
      id
      name
      description
    }
    waCampaignVariables {
      name
      description
    }
    audienceLists {
      id
      name
      member_count
    }
  }
`;

/**
 * The AiSensy side, read live through its Project API — campaigns and their
 * templates in one round trip. One query rather than one per section, because
 * the campaign form needs both together: a campaign names its template, and the
 * template says how many params a send must fill.
 */
export const AISENSY_CATALOGUE = gql`
  query AisensyCatalogue {
    aisensyProjectConfigured
    aisensyCampaigns {
      name
      status
      template_name
      type
      media_url
      media_filename
    }
    aisensyTemplates {
      id
      name
      status
      category
      language
      body
      param_count
      header
      header_format
      needs_media
      footer
      buttons
      cta_buttons {
        type
        text
        url
        url_param
      }
    }
  }
`;

export const WA_CAMPAIGN_REACH = gql`
  query WaCampaignReach(
    $audience: WaCampaignAudience!
    $audience_list_id: ID
    $user_ids: [ID!]
    $contacts: [WaManualContactInput!]
  ) {
    waCampaignReach(
      audience: $audience
      audience_list_id: $audience_list_id
      user_ids: $user_ids
      contacts: $contacts
    )
  }
`;

/** The people a "send to these people" picker offers. */
export const WA_USER_SEARCH = gql`
  query WaCampaignUserSearch($search: String!) {
    waCampaignUserSearch(search: $search) {
      id
      name
      destination
    }
  }
`;

const WA_PRICING_FIELDS = `
  marketing_per_msg utility_per_msg authentication_per_msg service_per_msg currency_symbol
`;

export const WA_PRICING = gql`
  query WaPricing {
    waPricing { ${WA_PRICING_FIELDS} }
  }
`;

export const UPDATE_WA_PRICING = gql`
  mutation UpdateWaPricing($input: UpdateWaPricingInput!) {
    updateWaPricing(input: $input) { ${WA_PRICING_FIELDS} }
  }
`;

/** What WhatsApp cost and reached over a window. */
export const WA_DASHBOARD = gql`
  query WaCampaignDashboard($from: String, $to: String) {
    waCampaignDashboard(from: $from, to: $to) {
      currency_symbol
      campaigns
      messages_sent
      messages_failed
      messages_skipped
      total_cost
      by_category {
        category
        campaigns
        messages
        failed
        skipped
        cost
      }
      top_campaigns {
        campaign_id
        name
        wa_campaign_name
        template_category
        messages
        cost
        status
        sent_at
      }
    }
  }
`;

export const WA_CAMPAIGNS_TABLE = gql`
  query WaCampaignsTable($query: TableQueryInput) {
    waCampaignsTable(query: $query) {
      total
      rows { ${WA_CAMPAIGN_FIELDS} }
    }
  }
`;

export const WA_CAMPAIGN = gql`
  query WaCampaign($campaign_id: ID!) {
    waCampaign(campaign_id: $campaign_id) { ${WA_CAMPAIGN_FIELDS} }
  }
`;

/**
 * Every WhatsApp send in one feed: campaign sends and the messages the platform
 * sent on its own. The server flattens both records onto this shape, so the one
 * Logs table pages, sorts and filters across them, and `kind` decides which
 * detail view opens behind a row.
 */
export const WA_LOGS = gql`
  query WaLogs($query: TableQueryInput) {
    waLogs(query: $query) {
      total
      rows {
        id
        kind
        name
        reference
        target
        status
        category
        recipient_count
        sent_count
        failed_count
        skipped_count
        msg_rate
        cost
        reason
        created_at
      }
    }
  }
`;

/** One automatic message in full — the fields the merged feed has no column
 * for, read only when its row is opened. */
export const WHATSAPP_MESSAGE_LOG = gql`
  query WhatsappMessageLog($id: ID!) {
    whatsappMessageLog(id: $id) {
      id
      event_key
      campaign
      category
      audience
      destination
      status
      reason
      params
      media_url
      media_filename
      submitted_message_id
      template_category
      msg_rate
      duration_ms
      created_at
    }
  }
`;

/** Who the send reached and who it did not — the detail view's table. */
export const WA_CAMPAIGN_RECIPIENTS = gql`
  query WaCampaignRecipients($campaign_id: ID!, $query: TableQueryInput) {
    waCampaignRecipients(campaign_id: $campaign_id, query: $query) {
      total
      rows {
        id
        name
        destination
        status
        reason
        submitted_message_id
        template_params
        attempts
        created_at
        updated_at
      }
    }
  }
`;

export const SEND_WA_CAMPAIGN = gql`
  mutation SendWaCampaign($input: SendWaCampaignInput!) {
    sendWaCampaign(input: $input) { ${WA_CAMPAIGN_FIELDS} }
  }
`;

export const CANCEL_WA_CAMPAIGN = gql`
  mutation CancelWaCampaign($campaign_id: ID!) {
    cancelWaCampaign(campaign_id: $campaign_id) { ${WA_CAMPAIGN_FIELDS} }
  }
`;

export const WA_CAMPAIGN_RECIPIENTS_CSV = gql`
  query WaCampaignRecipientsCsv($campaign_id: ID!) {
    waCampaignRecipientsCsv(campaign_id: $campaign_id)
  }
`;

export const RETRY_WA_CAMPAIGN = gql`
  mutation RetryWaCampaign($campaign_id: ID!) {
    retryWaCampaign(campaign_id: $campaign_id) { ${WA_CAMPAIGN_FIELDS} }
  }
`;

export const SEND_WA_TEST_MESSAGE = gql`
  mutation SendWaTestMessage($input: SendWaTestInput!) {
    sendWaTestMessage(input: $input) {
      ok
      submitted_message_id
      message
    }
  }
`;

export const DELETE_WA_CAMPAIGN = gql`
  mutation DeleteWaCampaign($campaign_id: ID!) {
    deleteWaCampaign(campaign_id: $campaign_id)
  }
`;

/**
 * The three writes that go straight to AiSensy — nothing they touch is stored
 * here. AiSensy has no update endpoint for a template or a campaign, which is
 * why there is no update mutation to import: replacing a template means
 * deleting it and submitting a new name.
 */
export const CREATE_AISENSY_TEMPLATE = gql`
  mutation CreateAisensyTemplate($input: CreateAisensyTemplateInput!) {
    createAisensyTemplate(input: $input) {
      name
      status
      reason
    }
  }
`;

export const CREATE_AISENSY_CAMPAIGN = gql`
  mutation CreateAisensyCampaign($input: CreateAisensyCampaignInput!) {
    createAisensyCampaign(input: $input) {
      name
      status
      template_name
    }
  }
`;

export const DELETE_AISENSY_TEMPLATE = gql`
  mutation DeleteAisensyTemplate($template_id: ID!) {
    deleteAisensyTemplate(template_id: $template_id)
  }
`;

export const CREATE_WA_CAMPAIGN_NAME = gql`
  mutation CreateWaCampaignName($input: WaCampaignNameInput!) {
    createWaCampaignName(input: $input) {
      id
      name
      description
    }
  }
`;

export const DELETE_WA_CAMPAIGN_NAME = gql`
  mutation DeleteWaCampaignName($id: ID!) {
    deleteWaCampaignName(id: $id)
  }
`;

export interface WaCampaignNameOption {
  id: string;
  name: string;
  description: string;
}

export interface WaCampaignVariable {
  name: string;
  description: string;
}

export interface WaAudienceList {
  id: string;
  name: string;
  member_count: number;
}

export interface AisensyCampaign {
  name: string;
  status: string;
  template_name: string;
  type: string;
  /**
   * The header asset this campaign was built with in the AiSensy console.
   *
   * It lives on the CAMPAIGN, never on the template, and the v2 send endpoint
   * demands it on every message the campaign sends — which is why a send form
   * prefills from here rather than asking for a URL that already exists.
   */
  media_url: string;
  media_filename: string;
}

/** One interactive button under a template's message. */
export interface AisensyTemplateButton {
  /** URL or PHONE_NUMBER. */
  type: string;
  /** The label WhatsApp draws on the button. */
  text: string;
  /** A URL button's link with its {{n}} intact; empty for every other kind. */
  url: string;
  /**
   * The {{n}} the link carries, or 0 when it is static. AiSensy numbers a
   * dynamic link AFTER the body's own variables, so this is the parameter's
   * position on the template — never the button's own position, which is what
   * `AisensyButtonInput.index` carries.
   */
  url_param: number;
}

export interface AisensyTemplate {
  /** AiSensy's own id — the only handle `deleteAisensyTemplate` accepts. */
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  body: string;
  param_count: number;
  /** The header line — empty for a media header or no header at all. */
  header: string;
  /** TEXT, IMAGE, VIDEO, DOCUMENT — empty when there is no header. */
  header_format: string;
  /** Whether every message on this template must carry a header asset. */
  needs_media: boolean;
  footer: string;
  buttons: string[];
  /** The interactive buttons in full — the only place a dynamic link shows up. */
  cta_buttons: AisensyTemplateButton[];
}

/** The header asset one send carries. AiSensy fetches the URL itself, so it has
 * to be reachable from the public internet. */
export interface AisensyMediaInput {
  url: string;
  filename: string;
}

/** What fills one CTA button's dynamic link. It travels in its own field and
 * never as one more template parameter. */
export interface AisensyButtonInput {
  /** The button's position in the template's `cta_buttons`, counting from zero. */
  index: number;
  value: string;
}

/** What Meta reviews. `header_text` and `footer_text` are left off entirely
 * when blank — AiSensy reads an empty string as "add an empty header". */
export interface CreateAisensyTemplateInput {
  name: string;
  category: string;
  language: string;
  type: string;
  body: string;
  sample: string;
  header_text?: string;
  footer_text?: string;
}

export interface CreateAisensyCampaignInput {
  template_name: string;
  campaign_name: string;
}

/** Meta decides asynchronously, so `status` comes back PENDING and `reason` is
 * whatever AiSensy said about it — data, shown verbatim. */
export interface AisensyTemplateDraft {
  name: string;
  status: string;
  reason: string;
}

export interface AisensyCampaignDraft {
  name: string;
  status: string;
  template_name: string;
}

export interface WaCampaignRecipientRow {
  id: string;
  name: string;
  destination: string;
  status: string;
  reason: string;
  submitted_message_id: string;
  template_params: string[];
  attempts: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface WaManualContact {
  name: string;
  extension: string;
  number: string;
}

export interface WaUserOption {
  id: string;
  name: string;
  destination: string;
}

export interface WaPricing {
  marketing_per_msg: number;
  utility_per_msg: number;
  authentication_per_msg: number;
  service_per_msg: number;
  currency_symbol: string;
}

export interface WaDashboardCategory {
  category: string;
  campaigns: number;
  messages: number;
  failed: number;
  skipped: number;
  cost: number;
}

export interface WaDashboardCampaign {
  campaign_id: string;
  name: string;
  wa_campaign_name: string;
  template_category: string;
  messages: number;
  cost: number;
  status: string;
  sent_at: string | null;
}

export interface WaDashboardData {
  currency_symbol: string;
  campaigns: number;
  messages_sent: number;
  messages_failed: number;
  messages_skipped: number;
  total_cost: number;
  by_category: WaDashboardCategory[];
  top_campaigns: WaDashboardCampaign[];
}

/** One row of the merged Logs feed. A campaign send is one row for many
 * messages; an automatic message is one row for itself, so its counters are
 * 1 or 0 and the same columns stay meaningful on both. */
export interface WaLogRow {
  id: string;
  kind: 'CAMPAIGN' | 'AUTOMATIC';
  name: string;
  /** The AiSensy campaign name for a campaign send; the scenario key for an automatic one. */
  reference: string;
  /** The audience for a campaign send; the number reached for an automatic one. */
  target: string;
  status: string;
  category: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  msg_rate: number;
  cost: number;
  reason: string;
  created_at: string | null;
}

/** One automatic message, in the detail behind its row. */
export interface WaMessageLogRow {
  id: string;
  event_key: string;
  campaign: string;
  category: string;
  audience: string;
  destination: string;
  status: string;
  reason: string;
  params: string[];
  /** The header asset this message carried; blank on a text template, and blank
   * on the send that came back "Media URL Missing". */
  media_url: string;
  media_filename: string;
  submitted_message_id: string;
  template_category: string;
  msg_rate: number;
  duration_ms: number;
  created_at: string | null;
}

export interface WaCampaignRow {
  campaign_id: string;
  name: string;
  wa_campaign_name: string;
  audience: string;
  audience_list_id: string | null;
  user_ids: string[];
  contacts: WaManualContact[];
  /** The template behind the campaign, frozen at send time. */
  template_name: string;
  template_category: string;
  /** The header asset every message in this send carried, frozen with it. */
  media: WaMediaRef | null;
  /** The per-message rate this send froze, and what it has cost so far. */
  msg_rate: number;
  cost: number;
  template_params: string[];
  status: string;
  scheduled_at: string | null;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  error: string | null;
  sent_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}
