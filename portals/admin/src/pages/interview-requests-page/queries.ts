import { gql } from '@apollo/client';

export const INTERVIEWS = gql`
  query Interviews($filter: InterviewFilterInput) {
    interviews(filter: $filter) {
      id
      type
      applicant_name
      applicant_email
      applicant_phone
      about
      business_name
      business_address
      city
      zone
      preferred_slots {
        start
        end
      }
      scheduled_slot {
        start
        end
      }
      status
      meeting_link
      admin_notes
      created_at
    }
  }
`;

export const UPDATE_INTERVIEW = gql`
  mutation UpdateInterview($interview_doc_id: ID!, $input: UpdateInterviewInput!) {
    updateInterview(interview_doc_id: $interview_doc_id, input: $input) {
      id
      status
    }
  }
`;

export const DELETE_INTERVIEW = gql`
  mutation DeleteInterview($interview_doc_id: ID!) {
    deleteInterview(interview_doc_id: $interview_doc_id)
  }
`;
