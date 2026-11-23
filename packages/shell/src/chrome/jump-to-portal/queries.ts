import { gql } from '@apollo/client';

export type PortalRequestStatus = 'PENDING' | 'APPROVED' | 'DENIED';

/** One console in the Jump to Portal directory, as the server sees this user. */
export interface PortalAccessEntry {
  key: string;
  name: string;
  url: string;
  has_access: boolean;
  can_request: boolean;
  /** Roles that open this console; SUPER_ADMIN opens every one. */
  required_roles: string[];
  request_status?: PortalRequestStatus | null;
}

export const MY_PORTAL_ACCESS = gql`
  query MyPortalAccess {
    myPortalAccess {
      key
      name
      url
      has_access
      can_request
      required_roles
      request_status
    }
  }
`;

export const REQUEST_PORTAL_ACCESS = gql`
  mutation RequestPortalAccess($portal_key: String!) {
    requestPortalAccess(portal_key: $portal_key) {
      key
      name
      url
      has_access
      can_request
      required_roles
      request_status
    }
  }
`;
