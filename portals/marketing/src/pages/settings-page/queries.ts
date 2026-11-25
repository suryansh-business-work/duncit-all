import { gql } from '@apollo/client';

/** The one OAuth redirect (callback) URL every network's app must register. */
export const SOCIAL_REDIRECT_URI = gql`
  query SocialRedirectUri {
    socialRedirectUri
  }
`;

export interface SocialRedirectUriData {
  socialRedirectUri: string;
}

/** Where Meta delivers Instagram and Messenger webhooks — pasted into the app's Webhooks setup. */
export const SOCIAL_WEBHOOK_URL = gql`
  query SocialWebhookUrl {
    socialWebhookUrl
  }
`;

export interface SocialWebhookUrlData {
  socialWebhookUrl: string;
}
