import { gql } from '@apollo/client';

/**
 * Asked on its own, not inside the bootstrap config: a server that predates
 * these fields then hides only the Truecaller button instead of failing the
 * Google/Apple config beside it.
 */
export const TRUECALLER_CONFIG = gql`
  query MwebTruecallerConfig {
    publicClientConfig {
      truecaller_app_key
      truecaller_partner_name
    }
  }
`;

export const START_TRUECALLER_WEB = gql`
  mutation StartTruecallerWebLogin($intent: TruecallerIntent!, $lang: String) {
    startTruecallerWebLogin(intent: $intent, lang: $lang) {
      request_nonce
      deep_link
    }
  }
`;

export const TRUECALLER_WEB_STATE = gql`
  query TruecallerWebState($nonce: String!) {
    truecallerWebState(request_nonce: $nonce)
  }
`;

export const LOGIN_WITH_TRUECALLER = gql`
  mutation LoginWithTruecaller($input: TruecallerAuthInput!) {
    loginWithTruecaller(input: $input) {
      status
      auth {
        token
        user {
          user_id
          first_name
          email
          roles
          onboarding_survey_completed
        }
      }
      signup {
        whatsapp_token
        phone_extension
        phone_number
        first_name
        last_name
        email
      }
    }
  }
`;
