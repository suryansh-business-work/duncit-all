import { gql } from '@apollo/client';

export type HostRequestStatus = 'REQUESTED' | 'ACKNOWLEDGED' | 'APPROVED' | 'REJECTED';

export interface HostRequest {
  id: string;
  request_no: string;
  host_name: string;
  host_email: string;
  host_phone: string;
  super_category_name: string;
  category_name: string;
  sub_category_name: string;
  status: HostRequestStatus;
  created_at: string;
}

/** Status filter options for the listing toolbar; '' = all. */
export const STATUS_FILTERS: { value: HostRequestStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const FIELDS = `
  id request_no host_name host_email host_phone
  super_category_name category_name sub_category_name status created_at
`;

export const HOST_REQUESTS = gql`
  query HostRequests($status: HostRequestStatus) {
    hostRequests(status: $status) { ${FIELDS} }
  }
`;

export const ACKNOWLEDGE_HOST_REQUEST = gql`
  mutation AcknowledgeHostRequest($id: ID!) {
    acknowledgeHostRequest(id: $id) { ${FIELDS} }
  }
`;

export const APPROVE_HOST_REQUEST = gql`
  mutation ApproveHostRequest($id: ID!, $notes: String) {
    approveHostRequest(id: $id, notes: $notes) { ${FIELDS} }
  }
`;

export const REJECT_HOST_REQUEST = gql`
  mutation RejectHostRequest($id: ID!, $notes: String!) {
    rejectHostRequest(id: $id, notes: $notes) { ${FIELDS} }
  }
`;
