import { gql } from '@apollo/client';

/**
 * The queue behind Support > FAQs > Submissions: the questions people asked on
 * duncit.com that no FAQ answers yet. Moved here from the Website portal, whose
 * managers could triage a submission but could not write the answer it asks
 * for — that has always lived in this portal (see ../queries.ts).
 */
export type FaqSubmissionStatus = 'NEW' | 'CONVERTED' | 'IGNORED';

export const FAQ_SUBMISSION_STATUSES: FaqSubmissionStatus[] = ['NEW', 'CONVERTED', 'IGNORED'];

export const FAQ_SUBMISSION_STATUS_COLOR: Record<
  FaqSubmissionStatus,
  'default' | 'primary' | 'success'
> = {
  NEW: 'primary',
  CONVERTED: 'success',
  IGNORED: 'default',
};

export interface FaqSubmissionRow {
  id: string;
  question: string;
  email: string | null;
  super_category_slug: string | null;
  status: FaqSubmissionStatus;
  created_at: string;
}

const FAQ_SUBMISSION_FIELDS = `
  id
  question
  email
  super_category_slug
  status
  created_at
`;

/** Unpaginated list, read only for the dashboard's "new submissions" count. */
export const FAQ_SUBMISSIONS = gql`
  query SupportFaqSubmissions($status: FaqSubmissionStatus) {
    faqSubmissions(status: $status) { ${FAQ_SUBMISSION_FIELDS} }
  }
`;

export const FAQ_SUBMISSIONS_TABLE = gql`
  query SupportFaqSubmissionsTable($query: TableQueryInput) {
    faqSubmissionsTable(query: $query) {
      total
      rows { ${FAQ_SUBMISSION_FIELDS} }
    }
  }
`;

export const UPDATE_FAQ_SUBMISSION_STATUS = gql`
  mutation SupportUpdateFaqSubmissionStatus($id: ID!, $status: FaqSubmissionStatus!) {
    updateFaqSubmissionStatus(faq_submission_id: $id, status: $status) {
      id
      status
    }
  }
`;
