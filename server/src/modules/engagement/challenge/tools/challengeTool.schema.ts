import gql from 'graphql-tag';

export const challengeToolTypeDefs = gql`
  "A universal challenge tool (Tool Master). The type is fixed; the rest is admin-owned."
  type ChallengeTool {
    id: ID!
    tool_type: String!
    name: String!
    description: String!
    "ACTIVE or INACTIVE. Only active tools can be added to new templates or mappings."
    status: String!
    version: Int!
    "False for catalogued tools the engine cannot run yet; they cannot be activated."
    engine_ready: Boolean!
    live_updates: Boolean!
    "True when the tool yields a number per competitor (it can rank or count toward the total)."
    produces_score: Boolean!
    input_types: [String!]!
    output_types: [String!]!
    "The editable settings, as a JSON array of { key, kind, default, min, max, options }."
    config_schema_json: String!
    default_config_json: String!
    "Category ids whose own mapping allows this tool."
    mapped_category_ids: [ID!]!
    created_at: String!
    updated_at: String!
  }

  "A named, reusable configuration of one tool."
  type ChallengeToolPreset {
    id: ID!
    tool_id: ID!
    name: String!
    config_json: String!
    version: Int!
    is_active: Boolean!
    updated_at: String!
  }

  "Challenge settings for one category node, or the nearest ancestor's when inherited."
  type ChallengeCategoryMapping {
    "Null when no row exists anywhere up the tree (challenges off)."
    id: ID
    category_id: ID!
    category_name: String!
    level: String!
    "The category whose row supplied these values."
    source_category_id: ID
    inherited: Boolean!
    enabled: Boolean!
    allowed_tool_ids: [ID!]!
    preset_ids: [ID!]!
    default_template_id: ID
    allow_host_customization: Boolean!
    show_on_pod_details_default: Boolean!
    allow_audience_voting: Boolean!
    require_challenge: Boolean!
    max_competitors: Int!
    updated_at: String!
  }

  input UpdateChallengeToolInput {
    name: String
    description: String
    "Default settings as a JSON object; validated against the tool's settings."
    default_config_json: String
    status: String
  }

  input ChallengeToolPresetInput {
    tool_id: ID!
    name: String!
    config_json: String
  }

  input UpdateChallengeToolPresetInput {
    name: String
    config_json: String
    is_active: Boolean
  }

  input ChallengeCategoryMappingInput {
    enabled: Boolean
    allowed_tool_ids: [ID!]
    preset_ids: [ID!]
    default_template_id: ID
    allow_host_customization: Boolean
    show_on_pod_details_default: Boolean
    allow_audience_voting: Boolean
    require_challenge: Boolean
    max_competitors: Int
  }

  extend type Query {
    challengeTools: [ChallengeTool!]!
    challengeTool(id: ID!): ChallengeTool
    challengeToolPresets(tool_id: ID): [ChallengeToolPreset!]!
    "Every category with its own challenge mapping row."
    challengeCategoryMappings: [ChallengeCategoryMapping!]!
    "The effective mapping for a category (its own row, or inherited)."
    challengeCategoryMapping(category_id: ID!): ChallengeCategoryMapping!
  }

  extend type Mutation {
    updateChallengeTool(id: ID!, input: UpdateChallengeToolInput!): ChallengeTool!
    "Makes these categories exactly the ones whose own mapping allows the tool."
    setChallengeToolCategories(tool_id: ID!, category_ids: [ID!]!): ChallengeTool!
    createChallengeToolPreset(input: ChallengeToolPresetInput!): ChallengeToolPreset!
    updateChallengeToolPreset(id: ID!, input: UpdateChallengeToolPresetInput!): ChallengeToolPreset!
    duplicateChallengeToolPreset(id: ID!): ChallengeToolPreset!
    upsertChallengeCategoryMapping(category_id: ID!, input: ChallengeCategoryMappingInput!): ChallengeCategoryMapping!
    "Removes the category's own row so it inherits from its parent."
    clearChallengeCategoryMapping(category_id: ID!): ChallengeCategoryMapping!
  }
`;
