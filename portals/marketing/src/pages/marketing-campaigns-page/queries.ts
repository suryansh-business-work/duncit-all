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

export const MARKETING_PREVIEW_CARDS = gql`
  query MarketingCampaignPreviewCards($type: MarketingCampaignCardType!) {
    marketingCampaignPreviewCards(type: $type) {
      id
      type
      title
      description
      image_url
      cta_url
      meta
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

export interface CampaignPreviewCard {
  id: string;
  type: 'POD' | 'CLUB';
  title: string;
  description?: string | null;
  image_url?: string | null;
  cta_url?: string | null;
  meta?: string | null;
}

export interface MarketingCampaignRow {
  campaign_id: string;
  name: string;
  channel: 'EMAIL' | 'WHATSAPP';
  audience: string;
  subject: string;
  scheduled_at?: string | null;
  sent_at?: string | null;
  status: string;
  recipient_count: number;
  error?: string | null;
  created_at: string;
  card?: { type?: string | null; title?: string | null } | null;
}