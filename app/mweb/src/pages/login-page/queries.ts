import { gql } from '@apollo/client';

export const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        user_id
        first_name
        email
        roles
        onboarding_survey_completed
      }
    }
  }
`;

export const LOGIN_GOOGLE = gql`
  mutation LoginWithGoogle($input: GoogleAuthInput!) {
    loginWithGoogle(input: $input) {
      token
      user {
        user_id
        first_name
        email
        roles
        onboarding_survey_completed
      }
    }
  }
`;

/** The "allow" half of the consent step: grants Google sign-in to an existing
 * email/password account and returns the same session a login would have. Sent
 * with the SAME id_token loginWithGoogle just rejected. */
export const LINK_GOOGLE_ACCOUNT = gql`
  mutation LinkGoogleAccount($input: GoogleAuthInput!) {
    linkGoogleAccount(input: $input) {
      token
      user {
        user_id
        first_name
        email
        roles
        onboarding_survey_completed
      }
    }
  }
`;
