import gql from 'graphql-tag';

export const rbacTypeDefs = gql`
  type Role {
    id: ID!
    key: String!
    name: String!
    description: String
    is_system: Boolean!
    created_at: String
    updated_at: String
  }

  type PublicRole {
    key: String!
    name: String!
    description: String
  }

  input CreateRoleInput {
    key: String!
    name: String!
    description: String
  }
  input UpdateRoleInput {
    name: String
    description: String
  }

  extend type Query {
    roles: [Role!]!
    role(role_id: ID!): Role
    publicRoles: [PublicRole!]!
  }

  extend type Mutation {
    createRole(input: CreateRoleInput!): Role!
    updateRole(role_id: ID!, input: UpdateRoleInput!): Role!
    deleteRole(role_id: ID!): Boolean!
  }
`;
