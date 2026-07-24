import { gql } from '@apollo/client';

export interface WarehouseApprovalRow {
  id: string;
  status: string;
  title: string;
  summary: string;
  requested_by_name: string | null;
  created_at: string | null;
}

export const WAREHOUSE_APPROVAL_REQUESTS = gql`
  query WarehouseApprovalRequests($status: ApprovalStatus) {
    warehouseApprovalRequests(status: $status) {
      id
      status
      title
      summary
      requested_by_name
      created_at
    }
  }
`;

export const APPROVE_WAREHOUSE_REQUEST = gql`
  mutation ApproveWarehouseRequest($id: ID!) {
    approveWarehouseRequest(id: $id) {
      id
      status
    }
  }
`;

export const DENY_WAREHOUSE_REQUEST = gql`
  mutation DenyWarehouseRequest($id: ID!, $notes: String) {
    denyWarehouseRequest(id: $id, notes: $notes) {
      id
      status
    }
  }
`;
