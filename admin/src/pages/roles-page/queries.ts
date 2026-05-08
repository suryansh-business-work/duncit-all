import { gql } from '@apollo/client';

export const ROLES_AND_PERMS = gql`
  query RolesAndPerms {
    roles {
      id
      key
      name
      description
      is_system
      permission_keys
    }
    permissions {
      id
      key
      resource_key
      action_key
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

export const SET_ROLE_PERMS = gql`
  mutation SetRolePermissions($role_id: ID!, $permission_keys: [String!]!) {
    setRolePermissions(role_id: $role_id, permission_keys: $permission_keys) {
      id
      permission_keys
    }
  }
`;
