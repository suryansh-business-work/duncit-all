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
