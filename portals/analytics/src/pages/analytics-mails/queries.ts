import { gql, type TypedDocumentNode } from '@apollo/client';
import type {
  AnalyticsMailSendResult,
  AnalyticsMailSettings,
  AnalyticsMailSubscription,
  MutationCreateAnalyticsMailSubscriptionArgs,
  MutationDeleteAnalyticsMailSubscriptionArgs,
  MutationSendAnalyticsMailNowArgs,
  MutationUpdateAnalyticsMailSettingsArgs,
  MutationUpdateAnalyticsMailSubscriptionArgs,
} from '@duncit/gql-types';

export type { AnalyticsMailSettings, AnalyticsMailSubscription };

const SETTINGS_FIELDS = `
  enabled
  time_of_day
  weekday
  time_zone
`;

const SUBSCRIPTION_FIELDS = `
  id
  name
  email
  pages
  frequency
  days
  is_active
  last_sent_at
  last_status
  last_error
  next_send_at
  created_at
`;

export const ANALYTICS_MAIL_SETTINGS: TypedDocumentNode<{ analyticsMailSettings: AnalyticsMailSettings }> = gql`
  query AnalyticsMailSettings {
    analyticsMailSettings {
      ${SETTINGS_FIELDS}
    }
  }
`;

export const UPDATE_ANALYTICS_MAIL_SETTINGS: TypedDocumentNode<
  { updateAnalyticsMailSettings: AnalyticsMailSettings },
  MutationUpdateAnalyticsMailSettingsArgs
> = gql`
  mutation UpdateAnalyticsMailSettings($input: AnalyticsMailSettingsInput!) {
    updateAnalyticsMailSettings(input: $input) {
      ${SETTINGS_FIELDS}
    }
  }
`;

export const ANALYTICS_MAIL_SUBSCRIPTIONS: TypedDocumentNode<{
  analyticsMailSubscriptions: AnalyticsMailSubscription[];
}> = gql`
  query AnalyticsMailSubscriptions {
    analyticsMailSubscriptions {
      ${SUBSCRIPTION_FIELDS}
    }
  }
`;

export const CREATE_ANALYTICS_MAIL_SUBSCRIPTION: TypedDocumentNode<
  { createAnalyticsMailSubscription: AnalyticsMailSubscription },
  MutationCreateAnalyticsMailSubscriptionArgs
> = gql`
  mutation CreateAnalyticsMailSubscription($input: AnalyticsMailSubscriptionInput!) {
    createAnalyticsMailSubscription(input: $input) {
      ${SUBSCRIPTION_FIELDS}
    }
  }
`;

export const UPDATE_ANALYTICS_MAIL_SUBSCRIPTION: TypedDocumentNode<
  { updateAnalyticsMailSubscription: AnalyticsMailSubscription },
  MutationUpdateAnalyticsMailSubscriptionArgs
> = gql`
  mutation UpdateAnalyticsMailSubscription($id: ID!, $input: AnalyticsMailSubscriptionInput!) {
    updateAnalyticsMailSubscription(id: $id, input: $input) {
      ${SUBSCRIPTION_FIELDS}
    }
  }
`;

export const DELETE_ANALYTICS_MAIL_SUBSCRIPTION: TypedDocumentNode<
  { deleteAnalyticsMailSubscription: boolean },
  MutationDeleteAnalyticsMailSubscriptionArgs
> = gql`
  mutation DeleteAnalyticsMailSubscription($id: ID!) {
    deleteAnalyticsMailSubscription(id: $id)
  }
`;

export const SEND_ANALYTICS_MAIL_NOW: TypedDocumentNode<
  { sendAnalyticsMailNow: AnalyticsMailSendResult },
  MutationSendAnalyticsMailNowArgs
> = gql`
  mutation SendAnalyticsMailNow($id: ID!) {
    sendAnalyticsMailNow(id: $id) {
      ok
      message
    }
  }
`;
