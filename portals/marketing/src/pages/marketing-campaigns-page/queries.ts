import { gql } from '@apollo/client';

export const MARKETING_CAMPAIGNS = gql`
  query MarketingCampaigns {
    marketingCampaigns {
      campaign_id
      name
      channel
      audience
      subject
      scheduled_at
      sent_at
      status
      recipient_count
      error
      created_at
      card {
        type
        title
      }
    }
  }
`;

/** Same selection as MARKETING_CAMPAIGNS rows — every allowlisted sort/filter
 * field (name, channel, audience, status, recipient_count, open_count,
 * click_count, scheduled_at, sent_at, created_at) is already selected. */
const MARKETING_CAMPAIGN_ROW_FIELDS = gql`
  fragment MarketingCampaignRowFields on MarketingCampaign {
    campaign_id
    name
    channel
    audience
    subject
    scheduled_at
    sent_at
    status
    recipient_count
    open_count
    click_count
    error
    created_at
    card {
      type
      title
    }
  }
`;

/** Server-side table page (search/sort/filter/paginate) for Campaign History. */
export const MARKETING_CAMPAIGNS_TABLE = gql`
  query MarketingCampaignsTable($query: TableQueryInput) {
    marketingCampaignsTable(query: $query) {
      total
      rows {
        ...MarketingCampaignRowFields
      }
    }
  }
  ${MARKETING_CAMPAIGN_ROW_FIELDS}
`;

/** One campaign in full. Kept separate from the row fragment on purpose:
 * `rendered_html` is an entire email body, and a page of rows must not carry
 * one per campaign just so a dialog can show one. */
export const MARKETING_CAMPAIGN = gql`
  query MarketingCampaign($campaign_id: ID!) {
    marketingCampaign(campaign_id: $campaign_id) {
      ...MarketingCampaignRowFields
      audience_list_id
      rendered_html
    }
  }
  ${MARKETING_CAMPAIGN_ROW_FIELDS}
`;

/** What a campaign author may write, straight from the renderer that
 * substitutes them — so the list can never drift from the truth. */
export const MARKETING_CAMPAIGN_VARIABLES = gql`
  query MarketingCampaignVariables {
    marketingCampaignVariables {
      name
      description
      sample
    }
  }
`;

export const RENDER_MARKETING_CAMPAIGN = gql`
  query RenderMarketingCampaign($input: MarketingCampaignPreviewInput!) {
    renderMarketingCampaign(input: $input) {
      subject
      html
      errors
      detected_variables
    }
  }
`;

/** Saved Target Audience lists, each with its live reach. */
export const AUDIENCE_LISTS_FOR_CAMPAIGN = gql`
  query AudienceListsForCampaign {
    audienceLists {
      id
      name
      member_count
    }
  }
`;

export const CREATE_MARKETING_CAMPAIGN = gql`
  mutation CreateMarketingCampaign($input: MarketingCampaignInput!) {
    createMarketingCampaign(input: $input) {
      campaign_id
      status
      recipient_count
      error
    }
  }
`;

export const SEND_MARKETING_CAMPAIGN = gql`
  mutation SendMarketingCampaign($campaign_id: ID!) {
    sendMarketingCampaign(campaign_id: $campaign_id) {
      campaign_id
      status
      recipient_count
      error
    }
  }
`;

export const DELETE_MARKETING_CAMPAIGN = gql`
  mutation DeleteMarketingCampaign($campaign_id: ID!) {
    deleteMarketingCampaign(campaign_id: $campaign_id)
  }
`;

export interface MarketingCampaignRow {
  campaign_id: string;
  name: string;
  channel: 'EMAIL';
  audience_list_id?: string | null;
  audience: string;
  subject: string;
  scheduled_at?: string | null;
  sent_at?: string | null;
  status: string;
  recipient_count: number;
  /** Totals, not headcounts — campaigns go out BCC'd, so an open cannot be
   * attributed to one recipient. */
  open_count: number;
  click_count: number;
  error?: string | null;
  created_at: string;
  card?: { type?: string | null; title?: string | null } | null;
}

export interface CampaignVariable {
  name: string;
  description: string;
  sample: string;
}

/** A row plus the parts only the details dialog asks for. */
export interface MarketingCampaignDetail extends MarketingCampaignRow {
  rendered_html?: string | null;
}