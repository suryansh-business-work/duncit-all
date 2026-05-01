import gql from 'graphql-tag';

export const rbacTypeDefs = gql`
  type Resource {
    id: ID!
    key: String!
    name: String!
    description: String
    is_system: Boolean!
    created_at: String
    updated_at: String
  }

  type Action {
    id: ID!
    key: String!
    name: String!
    description: String
    is_system: Boolean!
    created_at: String
    updated_at: String
  }

  type Permission {
    id: ID!
    key: String!
    resource_key: String!
    action_key: String!
    description: String
    is_system: Boolean!
    created_at: String
    updated_at: String
  }

  type Role {
    id: ID!
    key: String!
    name: String!
    description: String
    is_system: Boolean!
    permission_keys: [String!]!
    created_at: String
    updated_at: String
  }

  input CreateResourceInput {
    key: String!
    name: String!
    description: String
  }
  input UpdateResourceInput {
    name: String
    description: String
  }

  input CreateActionInput {
    key: String!
    name: String!
    description: String
  }
  input UpdateActionInput {
    name: String
    description: String
  }

  input CreatePermissionInput {
    resource_key: String!
    action_key: String!
    description: String
  }

  input CreateRoleInput {
    key: String!
    name: String!
    description: String
    permission_keys: [String!]
  }
  input UpdateRoleInput {
    name: String
    description: String
    permission_keys: [String!]
  }

  extend type Query {
    resources: [Resource!]!
    actions: [Action!]!
    permissions: [Permission!]!
    roles: [Role!]!
    role(role_id: ID!): Role
  }

  extend type Mutation {
    createResource(input: CreateResourceInput!): Resource!
    updateResource(resource_id: ID!, input: UpdateResourceInput!): Resource!
    deleteResource(resource_id: ID!): Boolean!

    createAction(input: CreateActionInput!): Action!
    updateAction(action_id: ID!, input: UpdateActionInput!): Action!
    deleteAction(action_id: ID!): Boolean!

    createPermission(input: CreatePermissionInput!): Permission!
    deletePermission(permission_id: ID!): Boolean!

    createRole(input: CreateRoleInput!): Role!
    updateRole(role_id: ID!, input: UpdateRoleInput!): Role!
    deleteRole(role_id: ID!): Boolean!
    setRolePermissions(role_id: ID!, permission_keys: [String!]!): Role!
  }
`;
