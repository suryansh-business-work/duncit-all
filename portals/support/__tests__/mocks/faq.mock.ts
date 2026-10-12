import type { MockedResponse } from '@apollo/client/testing';
import type { Faq, FaqSubmission } from '@duncit/gql-types';
import {
  CREATE_FAQ,
  DELETE_FAQ,
  FAQS_TABLE,
  SUPER_CATS_FOR_FAQ,
  UPDATE_FAQ,
} from '../../src/pages/faqs/queries';
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
  request: { query: FAQ_SUBMISSIONS_TABLE, variables: () => true },
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

/* ---- App and Partner FAQs (one server entity, audience pinned per page) ---- */

export type FaqMock = Pick<
  Faq,
  | 'id'
  | 'audience'
  | 'partner_topic'
  | 'super_category_id'
  | 'question'
  | 'answer'
  | 'is_active'
  | 'sort_order'
  | 'created_at'
  | 'updated_at'
> & {
  __typename: 'Faq';
  super_category: { __typename: 'Category'; id: string; name: string } | null;
};

export const makeFaq = (over: Partial<FaqMock> = {}): FaqMock => ({
  __typename: 'Faq',
  id: 'faq-1',
  audience: 'APP',
  partner_topic: null,
  super_category_id: 'sc-1',
  super_category: { __typename: 'Category', id: 'sc-1', name: 'Dining' },
  question: 'How do I join a pod?',
  answer: 'Open the pod and tap Join.',
  is_active: true,
  sort_order: 1,
  created_at: '2026-01-01T10:00:00.000Z',
  updated_at: '2026-01-01T10:00:00.000Z',
  ...over,
});

/**
 * The `faqsTable` page. Every request's variables are pushed onto `seen`, so a
 * spec can prove the audience filter the page pinned.
 */
export const faqsTableMock = (
  rows: FaqMock[] = [makeFaq()],
  seen: Array<Record<string, unknown>> = [],
): MockedResponse => ({
  request: { query: FAQS_TABLE, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: (variables) => {
    seen.push(variables as Record<string, unknown>);
    return {
      data: {
        faqsTable: { __typename: 'FaqTablePage', total: rows.length, rows },
      },
    };
  },
});

export const superCategoriesForFaqMock = (
  categories: Array<{ id: string; name: string }> = [
    { id: 'sc-1', name: 'Dining' },
    { id: 'sc-2', name: 'Sports' },
  ],
): MockedResponse => ({
  request: { query: SUPER_CATS_FOR_FAQ },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: { categories: categories.map((c) => ({ __typename: 'Category', ...c })) },
  },
});

type Matches = (variables: Record<string, unknown>) => boolean;

export const createFaqMock = (matches: Matches = () => true, fail?: string): MockedResponse => ({
  request: { query: CREATE_FAQ, variables: matches },
  result:
    fail === undefined
      ? { data: { createFaq: { __typename: 'Faq', id: 'faq-new' } } }
      : { errors: [{ message: fail }] },
});

export const updateFaqMock = (matches: Matches = () => true, fail?: string): MockedResponse => ({
  request: { query: UPDATE_FAQ, variables: matches },
  result:
    fail === undefined
      ? { data: { updateFaq: { __typename: 'Faq', id: 'faq-1' } } }
      : { errors: [{ message: fail }] },
});

export const deleteFaqMock = (id = 'faq-1', fail?: string): MockedResponse => ({
  request: { query: DELETE_FAQ, variables: { faq_doc_id: id } },
  result:
    fail === undefined ? { data: { deleteFaq: true } } : { errors: [{ message: fail }] },
});
