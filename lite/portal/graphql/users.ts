import { gql } from '@apollo/client';
import { LITE_USER_FIELDS, type LiteMe } from '../../shared/graphql/documents';

/** A user row is the same shape as the signed-in account. */
export type LiteAdminUserRow = LiteMe;

export const LITE_ADMIN_USERS_TABLE = gql`
  query LiteAdminUsersTable($query: TableQueryInput) {
    liteAdminUsersTable(query: $query) {
      rows {
        ...LiteUserFields
      }
      total
      page
      page_size
    }
  }
  ${LITE_USER_FIELDS}
`;

export const LITE_ADMIN_SET_USER_FLAGS = gql`
  mutation LiteAdminSetUserFlags($id: ID!, $is_admin: Boolean, $is_blocked: Boolean) {
    liteAdminSetUserFlags(id: $id, is_admin: $is_admin, is_blocked: $is_blocked) {
      ...LiteUserFields
    }
  }
  ${LITE_USER_FIELDS}
`;
