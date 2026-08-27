import type { MockedResponse } from '@apollo/client/testing';
import type { FaqSubmission } from '@duncit/gql-types';
import {
  FAQ_SUBMISSIONS,
  FAQ_SUBMISSIONS_TABLE,
  UPDATE_FAQ_SUBMISSION_STATUS,
  type FaqSubmissionStatus,
} from '../../src/pages/faqs/faq-submissions';

/**
 * FAQ-submission projection: a schema-synced `Pick` of the generated
 * `FaqSubmission` with the nullable `email` / `super_category_slug` narrowed to
 * the page's `string | null`, plus the cache `__typename`.
 */
export type FaqSubmissionMock = Pick<
  FaqSubmission,
  'id' | 'question' | 'status' | 'created_at'
> & {
  __typename: 'FaqSubmission';
  email: string | null;
  super_category_slug: string | null;
};

export const makeFaqSubmission = (over: Partial<FaqSubmissionMock> = {}): FaqSubmissionMock => ({
  __typename: 'FaqSubmission',
  id: 'f1',
  question: 'How do I join a pod?',
  email: 'q@duncit.com',
  super_category_slug: 'dining',
  status: 'NEW',
  created_at: '2026-01-01T10:00:00.000Z',
  ...over,
});

/**
 * The `faqSubmissionsTable` page `useApolloTableFetch` reads. Variables are
 * matched loosely so the table's initial fetch and every refetch resolve, and
 * the page wrapper carries its own `__typename` for the default-`addTypename`
 * cache.
 */
export const faqSubmissionsTableMock = (
  rows: FaqSubmissionMock[] = [makeFaqSubmission()],
): MockedResponse => ({
  request: { query: FAQ_SUBMISSIONS_TABLE },
  variableMatcher: () => true,
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      faqSubmissionsTable: {
        __typename: 'FaqSubmissionTablePage',
        total: rows.length,
        rows,
      },
    },
  },
});

/** The unpaginated NEW-only list behind the dashboard's submissions tile. */
export const faqSubmissionsListMock = (rows: FaqSubmissionMock[] = []): MockedResponse => ({
  request: { query: FAQ_SUBMISSIONS, variables: { status: 'NEW' } },
  result: { data: { faqSubmissions: rows } },
  maxUsageCount: 5,
});

export const updateFaqSubmissionStatusMock = (
  id: string,
  status: FaqSubmissionStatus,
): MockedResponse => ({
  request: { query: UPDATE_FAQ_SUBMISSION_STATUS, variables: { id, status } },
  result: { data: { updateFaqSubmissionStatus: { __typename: 'FaqSubmission', id, status } } },
});
