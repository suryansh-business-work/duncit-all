import { gql } from '@apollo/client';

export const ROLES_QUERY = gql`
  query Roles {
    roles {
      id
      key
      name
      description
      is_system
    }
  }
`;

/** Row shape for the server-paged roles table. */
export interface RoleRow {
  id: string;
  key: string;
  name: string;
  description: string;
  is_system: boolean;
  created_at: string;
}

export const ROLES_TABLE = gql`
  query RolesTable($query: TableQueryInput) {
    rolesTable(query: $query) {
      total
      rows {
        id
        key
        name
        description
        is_system
        created_at
      }
    }
  }
`;

export const CREATE_ROLE = gql`
  mutation CreateRole($input: CreateRoleInput!) {
    createRole(input: $input) {
      id
    }
  }
`;

export const UPDATE_ROLE = gql`
  mutation UpdateRole($role_id: ID!, $input: UpdateRoleInput!) {
    updateRole(role_id: $role_id, input: $input) {
      id
    }
  }
`;

export const DELETE_ROLE = gql`
  mutation DeleteRole($role_id: ID!) {
    deleteRole(role_id: $role_id)
  }
`;

export const ADMINS = gql`
  query Admins {
    users(filter: { role: "SUPER_ADMIN" }) {
      user_id
      full_name
      email
    }
  }
`;

export const SEARCH_USERS = gql`
  query SearchUsers($search: String) {
    users(filter: { search: $search }) {
      user_id
      full_name
      email
    }
  }
`;

export const GRANT_ADMIN = gql`
  mutation GrantAdminAccess($user_id: ID!) {
    grantAdminAccess(user_id: $user_id) {
      user_id
      roles
    }
  }
`;

export const REVOKE_ADMIN = gql`
  mutation RevokeAdminAccess($user_id: ID!) {
    revokeAdminAccess(user_id: $user_id) {
      user_id
      roles
    }
  }
`;
