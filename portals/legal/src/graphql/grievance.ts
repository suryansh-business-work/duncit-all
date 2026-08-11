import { gql } from '@apollo/client';
import type { GrievanceStatus } from '@duncit/utils';

export const GRIEVANCE_FIELDS = gql`
  fragment GrievanceFields on GrievanceTicket {
    id
    grievance_no
    source
    name
    email
    phone
    address
    subject
    description
    status
    resolution
    resolved_at
    handled_by_name
    created_at
    updated_at
  }
`;

export const GRIEVANCE_TICKETS_TABLE = gql`
  query GrievanceTicketsTable($query: TableQueryInput) {
    grievanceTicketsTable(query: $query) {
      total
      rows {
        ...GrievanceFields
      }
    }
  }
  ${GRIEVANCE_FIELDS}
`;

export const UPDATE_GRIEVANCE_STATUS = gql`
  mutation UpdateGrievanceStatus($id: ID!, $input: UpdateGrievanceStatusInput!) {
    updateGrievanceStatus(id: $id, input: $input) {
      ...GrievanceFields
    }
  }
  ${GRIEVANCE_FIELDS}
`;

export const GRIEVANCE_OFFICER = gql`
  query GrievanceOfficer {
    grievanceOfficer {
      name
      email
      phone
      address
      updated_at
    }
  }
`;

export const SAVE_GRIEVANCE_OFFICER = gql`
  mutation SaveGrievanceOfficer($input: SaveGrievanceOfficerInput!) {
    saveGrievanceOfficer(input: $input) {
      name
      email
      phone
      address
      updated_at
    }
  }
`;

export type GrievanceSource = 'APP' | 'WEBSITE' | 'PORTAL' | 'EMAIL';

export interface GrievanceTicket {
  id: string;
  /** Permanent handle, GRV-000001. Never edited, never reused. */
  grievance_no: string;
  source: GrievanceSource;
  name: string;
  email: string;
  phone: string;
  address: string;
  subject: string;
  description: string;
  status: GrievanceStatus;
  resolution: string;
  resolved_at: string | null;
  handled_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface GrievanceOfficer {
  name: string;
  email: string;
  phone: string;
  address: string;
  updated_at: string | null;
}

/** Status labels, and the colour each one wears in the queue. */
export const GRIEVANCE_STATUS_LABEL: Record<GrievanceStatus, string> = {
  RECEIVED: 'Received',
  IN_REVIEW: 'In review',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
};

export const GRIEVANCE_STATUS_COLOR: Record<
  GrievanceStatus,
  'default' | 'info' | 'success' | 'error'
> = {
  RECEIVED: 'default',
  IN_REVIEW: 'info',
  RESOLVED: 'success',
  REJECTED: 'error',
};

export const GRIEVANCE_STATUS_OPTIONS = (
  Object.keys(GRIEVANCE_STATUS_LABEL) as GrievanceStatus[]
).map((value) => ({ value, label: GRIEVANCE_STATUS_LABEL[value] }));
