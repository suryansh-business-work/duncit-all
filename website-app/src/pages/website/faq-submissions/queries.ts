import { gql } from '@apollo/client';

export type FaqSubmissionStatus = 'NEW' | 'CONVERTED' | 'IGNORED';

export const FAQ_STATUSES: FaqSubmissionStatus[] = ['NEW', 'CONVERTED', 'IGNORED'];

export const FAQ_STATUS_COLOR: Record<FaqSubmissionStatus, 'default' | 'primary' | 'success'> = {
  NEW: 'primary',
  CONVERTED: 'success',
  IGNORED: 'default',
};

export interface FaqSubmission {
  id: string;
  question: string;
  email: string | null;
  super_category_slug: string | null;
  status: FaqSubmissionStatus;
  created_at: string;
}

export const FAQ_SUBMISSIONS = gql`
  query FaqSubmissions($status: FaqSubmissionStatus) {
    faqSubmissions(status: $status) {
      id
      question
      email
      super_category_slug
      status
      created_at
    }
  }
`;

export const UPDATE_FAQ_SUBMISSION_STATUS = gql`
  mutation UpdateFaqSubmissionStatus($id: ID!, $status: FaqSubmissionStatus!) {
    updateFaqSubmissionStatus(faq_submission_id: $id, status: $status) {
      id
      status
    }
  }
`;
