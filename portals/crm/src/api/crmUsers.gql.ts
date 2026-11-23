import { gql } from '@apollo/client';
import type { CrmStaffUser } from './crm.types';

const STAFF_USER_FIELDS = `id name email roles is_staff`;

/** Active CRM team members matching a search — the Assigned To picker, the listing filter and @mentions. */
export const CRM_ASSIGNABLE_USERS = gql`
  query CrmAssignableUsers($search: String, $limit: Int) {
    crmAssignableUsers(search: $search, limit: $limit) { ${STAFF_USER_FIELDS} }
  }
`;

/** The names behind the user ids a lead page shows (log authors, mentions), in one request. */
export const CRM_USERS_BY_IDS = gql`
  query CrmUsersByIds($ids: [ID!]!) {
    crmUsersByIds(ids: $ids) { ${STAFF_USER_FIELDS} }
  }
`;

export interface CrmAssignableUsersData {
  crmAssignableUsers: CrmStaffUser[];
}

export interface CrmUsersByIdsData {
  crmUsersByIds: CrmStaffUser[];
}
