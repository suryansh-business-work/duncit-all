import { gql } from '@/generated/graphql';

/**
 * The Truecaller identifiers the SDK is initialised with. Asked on its own,
 * not inside MobilePublicClientConfig: a server that predates these fields
 * then hides only the Truecaller button instead of failing Google and Apple.
 */
export const TruecallerConfigDocument = gql(`
  query MobileTruecallerConfig {
    publicClientConfig {
      truecaller_android_client_id
      truecaller_app_key
      truecaller_ios_app_link
    }
  }
`);

/** Continue with Truecaller — a session for a known number, a signup proof for a new one. */
export const LoginWithTruecallerDocument = gql(`
  mutation MobileLoginWithTruecaller($input: TruecallerAuthInput!) {
    loginWithTruecaller(input: $input) {
      status
      auth {
        token
        user {
          user_id
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
`);
