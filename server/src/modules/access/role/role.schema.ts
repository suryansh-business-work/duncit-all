import gql from 'graphql-tag';

/** Role assignment on a user. The Role catalogue itself lives in rbac.schema. */
export const userRoleTypeDefs = gql`
  extend type Mutation {
    assignUserRoles(user_id: ID!, role_keys: [String!]!): User!
    addUserRole(user_id: ID!, role_key: String!): User!
    removeUserRole(user_id: ID!, role_key: String!): User!
    grantAdminAccess(user_id: ID!): User!
    revokeAdminAccess(user_id: ID!): User!
  }
`;
