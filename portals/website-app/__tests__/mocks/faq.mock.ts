import type { MockedResponse } from '@apollo/client/testing';
import type { FaqSubmission as SchemaFaqSubmission } from '@duncit/gql-types';
import {
  FAQ_SUBMISSIONS,
  FAQ_SUBMISSIONS_TABLE,
  UPDATE_FAQ_SUBMISSION_STATUS,
  type FaqSubmissionStatus,
} from '../../src/pages/website/faq-submissions/queries';
import { tablePageMock } from './table';

/**
 * FAQ-submission projection: a schema-synced `Pick` of the generated
 * `FaqSubmission` with the nullable `email` / `super_category_slug` narrowed to
 * the app's `string | null`, plus the cache `__typename`.
 */
export type FaqSubmissionMock = Pick<
  SchemaFaqSubmission,
  'id' | 'question' | 'status' | 'created_at'
> & {
  __typename: 'FaqSubmission';
  email: string | null;
  super_category_slug: string | null;
};

export const makeFaqSubmission = (over: Partial<FaqSubmissionMock> = {}): FaqSubmissionMock => ({
  __typename: 'FaqSubmission',
  id: 'f1',
  question: 'How do I join?',
  email: 'q@duncit.com',
  super_category_slug: 'events',
  status: 'NEW',
  created_at: '2026-01-01T10:00:00.000Z',
  ...over,
});

export const faqSubmissionsTableMock = (
  rows: FaqSubmissionMock[] = [makeFaqSubmission()],
): MockedResponse =>
  tablePageMock(FAQ_SUBMISSIONS_TABLE, 'faqSubmissionsTable', 'FaqSubmissionTablePage', rows);

/** Full list query (dashboard KPI counts). */
export const faqSubmissionsListMock = (rows: FaqSubmissionMock[] = []): MockedResponse => ({
  request: { query: FAQ_SUBMISSIONS },
  variableMatcher: () => true,
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { faqSubmissions: rows } },
});

export const updateFaqSubmissionStatusMock = (
  id: string,
  status: FaqSubmissionStatus,
): MockedResponse => ({
  request: { query: UPDATE_FAQ_SUBMISSION_STATUS, variables: { id, status } },
  result: { data: { updateFaqSubmissionStatus: { __typename: 'FaqSubmission', id, status } } },
});
