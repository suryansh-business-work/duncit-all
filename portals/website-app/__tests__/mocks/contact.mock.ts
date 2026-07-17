import type { MockedResponse } from '@apollo/client/testing';
import type { ContactSubmission as SchemaContactSubmission } from '@duncit/gql-types';
import {
  CONTACT_SUBMISSIONS,
  CONTACT_TABLE,
  UPDATE_CONTACT_STATUS,
  type ContactStatus,
} from '../../src/pages/website/contact-submissions/queries';
import { tablePageMock } from './table';

/**
 * Contact-submission projection, a schema-synced `Pick` of the generated
 * `ContactSubmission` (drift on any selected field breaks typecheck) carrying
 * the `__typename` the Apollo cache normalises on under the default addTypename.
 */
export type ContactSubmissionMock = Pick<
  SchemaContactSubmission,
  'id' | 'name' | 'email' | 'subject' | 'message' | 'attachments' | 'status' | 'created_at'
> & { __typename: 'ContactSubmission' };

export const makeContactSubmission = (
  over: Partial<ContactSubmissionMock> = {},
): ContactSubmissionMock => ({
  __typename: 'ContactSubmission',
  id: 'c1',
  name: 'Asha',
  email: 'asha@example.com',
  subject: 'Need help',
  message: 'Hello there',
  attachments: [],
  status: 'NEW',
  created_at: '2026-01-01T10:00:00.000Z',
  ...over,
});

export const contactSubmissionsTableMock = (
  rows: ContactSubmissionMock[] = [makeContactSubmission()],
): MockedResponse =>
  tablePageMock(CONTACT_TABLE, 'contactSubmissionsTable', 'ContactSubmissionTablePage', rows);

/** Full list query (dashboard KPI counts). */
export const contactSubmissionsListMock = (
  rows: ContactSubmissionMock[] = [],
): MockedResponse => ({
  request: { query: CONTACT_SUBMISSIONS },
  variableMatcher: () => true,
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { contactSubmissions: rows } },
});

export const updateContactStatusMock = (id: string, status: ContactStatus): MockedResponse => ({
  request: { query: UPDATE_CONTACT_STATUS, variables: { id, status } },
  result: { data: { updateContactStatus: { __typename: 'ContactSubmission', id, status } } },
});
