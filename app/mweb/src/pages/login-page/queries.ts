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
