import { gql } from '@apollo/client';

export const AISENSY_STATUS = gql`
  query AisensyStatus {
    aisensyStatus {
      configured
      default_campaign
    }
  }
`;

export const SEND_AISENSY_CAMPAIGN = gql`
  mutation SendAisensyCampaign($input: SendAisensyCampaignInput!) {
    sendAisensyCampaign(input: $input) {
      ok
      submitted_message_id
      message
    }
  }
`;

export interface AisensyStatus {
  configured: boolean;
  default_campaign: string;
}

export interface AisensySendResult {
  ok: boolean;
  submitted_message_id: string;
  message: string;
}

export interface SendAisensyCampaignInput {
  campaign_name: string;
  destination: string;
  user_name: string;
  template_params: string[];
}
