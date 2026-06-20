import gql from 'graphql-tag';

export const challengeTypeDefs = gql`
  "A challenge scoped to the Super → Category → Sub category hierarchy."
  type Challenge {
    id: ID!
    name: String!
    description: String
    super_category_id: ID
    category_id: ID
    sub_category_id: ID
    super_category_name: String
    category_name: String
    sub_category_name: String
    is_active: Boolean!
    created_at: String!
    updated_at: String!
  }

  "Dashboard counters for the Challenges console."
  type ChallengeStats {
    total: Int!
    active: Int!
  }

  input CreateChallengeInput {
    name: String!
    description: String
    super_category_id: ID
    category_id: ID
    sub_category_id: ID
  }

  input UpdateChallengeInput {
    name: String
    description: String
    super_category_id: ID
    category_id: ID
    sub_category_id: ID
    is_active: Boolean
  }

  extend type Query {
    "All challenges (optionally filtered by a name search)."
    challenges(search: String): [Challenge!]!
    "Total + active challenge counts for the dashboard."
    challengeStats: ChallengeStats!
    "A single challenge by id."
    challenge(id: ID!): Challenge
  }

  extend type Mutation {
    createChallenge(input: CreateChallengeInput!): Challenge!
    updateChallenge(id: ID!, input: UpdateChallengeInput!): Challenge!
    deleteChallenge(id: ID!): Boolean!
  }
`;
