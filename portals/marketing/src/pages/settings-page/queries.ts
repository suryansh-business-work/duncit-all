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
