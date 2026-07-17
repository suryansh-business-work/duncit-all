import type { MockedResponse } from '@apollo/client/testing';
import type { JobApplication as SchemaJobApplication } from '@duncit/gql-types';
import {
  JOB_APPLICATIONS_TABLE,
  UPDATE_JOB_APPLICATION_STATUS,
  type JobApplicationStatus,
} from '../../src/pages/website/job-applications/queries';
import { tablePageMock } from './table';

/**
 * Job-application row projection. Typed as a schema-synced `Pick` of the
 * generated `JobApplication` (a renamed/removed server field breaks typecheck),
 * with the nullable `role_content_id` narrowed to the app's `string | null` and
 * the `__typename` the Apollo cache needs under the default `addTypename`.
 */
export type JobApplicationMock = Pick<
  SchemaJobApplication,
  | 'id'
  | 'role_title'
  | 'name'
  | 'email'
  | 'phone'
  | 'resume_url'
  | 'portfolio_url'
  | 'cover_note'
  | 'status'
  | 'created_at'
> & { __typename: 'JobApplication'; role_content_id: string | null };

export const makeJobApplication = (over: Partial<JobApplicationMock> = {}): JobApplicationMock => ({
  __typename: 'JobApplication',
  id: 'j1',
  role_content_id: 'r1',
  role_title: 'Engineer',
  name: 'Nia',
  email: 'nia@example.com',
  phone: '+91999',
  resume_url: 'https://cv/nia.pdf',
  portfolio_url: 'https://port/nia',
  cover_note: 'Excited to apply',
  status: 'NEW',
  created_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

export const jobApplicationsTableMock = (
  rows: JobApplicationMock[] = [makeJobApplication()],
): MockedResponse =>
  tablePageMock(JOB_APPLICATIONS_TABLE, 'jobApplicationsTable', 'JobApplicationTablePage', rows);

export const updateJobApplicationStatusMock = (
  id: string,
  status: JobApplicationStatus,
): MockedResponse => ({
  request: { query: UPDATE_JOB_APPLICATION_STATUS, variables: { id, status } },
  result: { data: { updateJobApplicationStatus: { __typename: 'JobApplication', id, status } } },
});
