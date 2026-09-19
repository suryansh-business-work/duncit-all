import type { MockedResponse } from '@apollo/client/testing';
import type { GrievanceOfficer, GrievanceTicket } from '@duncit/gql-types';
import {
  GRIEVANCE_OFFICER,
  SAVE_GRIEVANCE_OFFICER,
  UPDATE_GRIEVANCE_STATUS,
} from '../../src/graphql/grievance';

/**
 * Grievance-desk mocks: the ticket queue's `GrievanceFields` projection and the
 * published Grievance Officer record, both typed from the generated schema.
 */
const ISO = '2026-03-04T09:30:00.000Z';

export type GrievanceTicketMock = Pick<
  GrievanceTicket,
  | 'id'
  | 'grievance_no'
  | 'source'
  | 'name'
  | 'email'
  | 'phone'
  | 'address'
  | 'support_ticket_ref'
  | 'subject'
  | 'description'
  | 'status'
  | 'resolution'
  | 'resolved_at'
  | 'handled_by_name'
  | 'created_at'
  | 'updated_at'
> & { __typename: 'GrievanceTicket' };

export const makeGrievanceTicket = (
  over: Partial<GrievanceTicketMock> = {},
): GrievanceTicketMock => ({
  __typename: 'GrievanceTicket',
  id: 'grv-1',
  grievance_no: 'GRV-000123',
  source: 'APP',
  name: 'Asha Rao',
  email: 'asha.rao@example.com',
  phone: '+91 98765 43210',
  address: '12 MG Road, Bengaluru',
  support_ticket_ref: 'ST-000981',
  subject: 'Refund for the cancelled badminton pod',
  description: 'The host cancelled DUN-POD-4821 and my ₹499 has not come back.',
  status: 'IN_REVIEW',
  resolution: '',
  resolved_at: null,
  handled_by_name: '',
  created_at: ISO,
  updated_at: ISO,
  ...over,
});

export const updateGrievanceStatusMock = (
  ticket: GrievanceTicketMock = makeGrievanceTicket(),
): MockedResponse => ({
  request: { query: UPDATE_GRIEVANCE_STATUS, variables: () => true },
  result: { data: { updateGrievanceStatus: ticket } },
});

export const updateGrievanceStatusErrorMock = (message: string): MockedResponse => ({
  request: { query: UPDATE_GRIEVANCE_STATUS, variables: () => true },
  result: { errors: [{ message }] },
});

export type GrievanceOfficerMock = Pick<
  GrievanceOfficer,
  'name' | 'email' | 'phone' | 'address' | 'updated_at'
> & { __typename: 'GrievanceOfficer' };

export const makeGrievanceOfficer = (
  over: Partial<GrievanceOfficerMock> = {},
): GrievanceOfficerMock => ({
  __typename: 'GrievanceOfficer',
  name: 'Priya Sharma',
  email: 'grievance@duncit.com',
  phone: '+91 98765 43210',
  address: 'Duncit HQ, Bengaluru',
  updated_at: ISO,
  ...over,
});

export const grievanceOfficerMock = (
  officer: GrievanceOfficerMock | null = makeGrievanceOfficer(),
): MockedResponse => ({
  request: { query: GRIEVANCE_OFFICER },
  result: { data: { grievanceOfficer: officer } },
});

export const saveGrievanceOfficerMock = (
  officer: GrievanceOfficerMock = makeGrievanceOfficer(),
): MockedResponse => ({
  request: { query: SAVE_GRIEVANCE_OFFICER, variables: () => true },
  result: { data: { saveGrievanceOfficer: officer } },
});

export const saveGrievanceOfficerErrorMock = (message: string): MockedResponse => ({
  request: { query: SAVE_GRIEVANCE_OFFICER, variables: () => true },
  result: { errors: [{ message }] },
});
