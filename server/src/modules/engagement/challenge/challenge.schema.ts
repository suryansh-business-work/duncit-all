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
    "INDIVIDUAL ranks players; TEAM ranks teams."
    participant_mode: String!
    "The universal tools this template combines, each with its own settings."
    tool_instances: [ChallengeToolInstance!]!
    winner_rules: ChallengeWinnerRules!
    created_at: String!
    updated_at: String!
  }

  "One use of a universal tool inside a template (a tool may appear more than once)."
  type ChallengeToolInstance {
    instance_id: String!
    tool_id: ID!
    tool_type: String!
    tool_version: Int!
    preset_id: ID
    label: String!
    config_json: String!
  }

  "One ranking key: TOTAL or a scoring tool instance id."
  type ChallengeRankKey {
    rank_by: String!
    direction: String!
  }

  type ChallengeWinnerRules {
    rank_by: String!
    direction: String!
    tie_breakers: [ChallengeRankKey!]!
    podium_size: Int!
  }

  input ChallengeToolInstanceInput {
    "Keep an existing instance id when editing so pod challenges stay traceable."
    instance_id: String
    tool_id: ID!
    preset_id: ID
    label: String!
    "Settings overriding the tool defaults/preset, as a JSON object."
    config_json: String
  }

  input ChallengeRankKeyInput {
    rank_by: String!
    direction: String!
  }

  input ChallengeWinnerRulesInput {
    rank_by: String!
    direction: String!
    tie_breakers: [ChallengeRankKeyInput!]
    podium_size: Int
  }

  "Dashboard counters for the Challenges console."
  type ChallengeStats {
    total: Int!
    active: Int!
  }

  "Server-side table page for the shared table engine (challengesTable)."
  type ChallengeTablePage {
    rows: [Challenge!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input CreateChallengeInput {
    name: String!
    description: String
    super_category_id: ID
    category_id: ID
    sub_category_id: ID
    tool_instances: [ChallengeToolInstanceInput!]
    participant_mode: String
    winner_rules: ChallengeWinnerRulesInput
  }

  input UpdateChallengeInput {
    name: String
    description: String
    super_category_id: ID
    category_id: ID
    sub_category_id: ID
    is_active: Boolean
    tool_instances: [ChallengeToolInstanceInput!]
    participant_mode: String
    winner_rules: ChallengeWinnerRulesInput
  }

  extend type Query {
    "All challenges (optionally filtered by a name search)."
    challenges(search: String): [Challenge!]!
    challengesTable(query: TableQueryInput): ChallengeTablePage!
    "Total + active challenge counts for the dashboard."
    challengeStats: ChallengeStats!
    "A single challenge by id."
    challenge(id: ID!): Challenge
  }

  extend type Mutation {
    createChallenge(input: CreateChallengeInput!): Challenge!
    updateChallenge(id: ID!, input: UpdateChallengeInput!): Challenge!
    deleteChallenge(id: ID!): Boolean!
    "Copies a template (inactive) to adapt for another activity."
    duplicateChallenge(id: ID!): Challenge!
  }
`;
