import { gql } from '@apollo/client';

export const QUERY = gql`
  query PermissionsAndDeps {
    permissions {
      id
      key
      resource_key
      action_key
      description
      is_system
    }
    resources {
      key
      name
    }
    actions {
      key
      name
    }
  }
`;

export const CREATE_PERMISSION = gql`
  mutation CreatePermission($input: CreatePermissionInput!) {
    createPermission(input: $input) {
      id
    }
  }
`;

export const DELETE_PERMISSION = gql`
  mutation DeletePermission($permission_id: ID!) {
    deletePermission(permission_id: $permission_id)
  }
`;
