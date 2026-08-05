import { gql } from '@apollo/client';

const WA_CAMPAIGN_FIELDS = `
  campaign_id name wa_campaign_name audience audience_list_id template_params
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
    }
  }
`;

export const WA_CAMPAIGN_REACH = gql`
  query WaCampaignReach($audience: WaCampaignAudience!, $audience_list_id: ID) {
    waCampaignReach(audience: $audience, audience_list_id: $audience_list_id)
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

export interface WaCampaignRow {
  campaign_id: string;
  name: string;
  wa_campaign_name: string;
  audience: string;
  audience_list_id: string | null;
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
