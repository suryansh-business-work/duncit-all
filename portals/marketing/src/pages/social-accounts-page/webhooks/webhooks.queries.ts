import { gql } from '@apollo/client';

/** Social Accounts › Webhooks: Meta's registration for each app, and the last deliveries (social.webhook.resolver.ts). */
export type WebhookDeliveryStatus = 'RECEIVED' | 'PROCESSING' | 'PROCESSED' | 'FAILED';

export interface WebhookObjectStatus {
  object: string;
  registered: boolean;
  active: boolean;
  callback_url: string;
  callback_matches: boolean;
  fields: string[];
  missing_fields: string[];
}

export interface WebhookAppStatus {
  entry_id: string;
  name: string;
  app_id: string;
  secret_set: boolean;
  verify_token_set: boolean;
  callback_url: string;
  objects: WebhookObjectStatus[];
  error: string;
}

export interface WebhookDelivery {
  id: string;
  object: string;
  entry_ids: string[];
  fields: string[];
  status: WebhookDeliveryStatus;
  attempts: number;
  outcome: { events: number; stored: number; duplicates: number; echoes: number; unknown_account: number; failed: number };
  error: string;
  body: string;
  received_at: string;
  processed_at: string | null;
}

const APP_FIELDS = gql`
  fragment SocialWebhookAppFields on SocialWebhookAppStatus {
    entry_id
    name
    app_id
    secret_set
    verify_token_set
    callback_url
    error
    objects {
      object
      registered
      active
      callback_url
      callback_matches
      fields
      missing_fields
    }
  }
`;

export const SOCIAL_WEBHOOK_SETUP = gql`
  query SocialWebhookSetup {
    socialWebhookSetup {
      ...SocialWebhookAppFields
    }
  }
  ${APP_FIELDS}
`;

export const REGISTER_SOCIAL_WEBHOOK = gql`
  mutation RegisterSocialWebhook($entry_id: ID!) {
    registerSocialWebhook(entry_id: $entry_id) {
      ...SocialWebhookAppFields
    }
  }
  ${APP_FIELDS}
`;

export const SOCIAL_WEBHOOK_DELIVERIES = gql`
  query SocialWebhookDeliveries($limit: Int) {
    socialWebhookDeliveries(limit: $limit) {
      id
      object
      entry_ids
      fields
      status
      attempts
      outcome {
        events
        stored
        duplicates
        echoes
        unknown_account
        failed
      }
      error
      body
      received_at
      processed_at
    }
  }
`;
