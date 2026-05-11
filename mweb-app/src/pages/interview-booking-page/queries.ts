import { gql } from '@apollo/client';

export const CREATE_INTERVIEW = gql`
  mutation CreateInterview($input: CreateInterviewInput!) {
    createInterview(input: $input) {
      id
      status
    }
  }
`;
