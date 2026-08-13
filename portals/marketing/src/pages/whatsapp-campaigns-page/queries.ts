import { gql } from '@apollo/client';

const WA_CAMPAIGN_FIELDS = `
  campaign_id name wa_campaign_name audience audience_list_id template_params
  user_ids contacts { name extension number }
  template_name template_category msg_rate cost
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
    }
    aisensyTemplates {
      name
      status
      category
      language
      body
      param_count
      header
      header_format
      footer
      buttons
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
}

export interface AisensyTemplate {
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
  footer: string;
  buttons: string[];
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
