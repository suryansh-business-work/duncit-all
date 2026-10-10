import { gql, type TypedDocumentNode } from '@apollo/client';
import type {
  Category,
  ChallengeCategoryMapping,
  ChallengeTool,
  ChallengeToolPreset,
  ChallengeToolPresetInput,
  UpdateChallengeToolInput,
  UpdateChallengeToolPresetInput,
} from '@duncit/gql-types';

export type ToolRow = Pick<
  ChallengeTool,
  | 'id'
  | 'tool_type'
  | 'name'
  | 'description'
  | 'status'
  | 'version'
  | 'engine_ready'
  | 'live_updates'
  | 'produces_score'
  | 'config_schema_json'
  | 'default_config_json'
  | 'mapped_category_ids'
  | 'updated_at'
>;

export type PresetRow = Pick<ChallengeToolPreset, 'id' | 'tool_id' | 'name' | 'config_json' | 'version' | 'is_active' | 'updated_at'>;

export type MappingRow = Pick<
  ChallengeCategoryMapping,
  'id' | 'category_id' | 'category_name' | 'level' | 'enabled' | 'allowed_tool_ids' | 'default_template_id' | 'updated_at'
>;

export type CategoryNode = Pick<Category, 'id' | 'name' | 'level' | 'parent_id'>;

/** Tool Master rows. */
export const CHALLENGE_TOOLS: TypedDocumentNode<{ challengeTools: ToolRow[] }> = gql`
  query ChallengeTools {
    challengeTools {
      id
      tool_type
      name
      description
      status
      version
      engine_ready
      live_updates
      produces_score
      config_schema_json
      default_config_json
      mapped_category_ids
      updated_at
    }
  }
`;

export const UPDATE_CHALLENGE_TOOL: TypedDocumentNode<unknown, { id: string; input: UpdateChallengeToolInput }> = gql`
  mutation UpdateChallengeTool($id: ID!, $input: UpdateChallengeToolInput!) {
    updateChallengeTool(id: $id, input: $input) {
      id
      name
      description
      status
      version
      default_config_json
    }
  }
`;

export const SET_CHALLENGE_TOOL_CATEGORIES: TypedDocumentNode<unknown, { toolId: string; categoryIds: string[] }> = gql`
  mutation SetChallengeToolCategories($toolId: ID!, $categoryIds: [ID!]!) {
    setChallengeToolCategories(tool_id: $toolId, category_ids: $categoryIds) {
      id
      mapped_category_ids
    }
  }
`;

export const CHALLENGE_TOOL_PRESETS: TypedDocumentNode<{ challengeToolPresets: PresetRow[] }> = gql`
  query ChallengeToolPresets {
    challengeToolPresets {
      id
      tool_id
      name
      config_json
      version
      is_active
      updated_at
    }
  }
`;

export const CREATE_CHALLENGE_TOOL_PRESET: TypedDocumentNode<unknown, { input: ChallengeToolPresetInput }> = gql`
  mutation CreateChallengeToolPreset($input: ChallengeToolPresetInput!) {
    createChallengeToolPreset(input: $input) {
      id
    }
  }
`;

export const UPDATE_CHALLENGE_TOOL_PRESET: TypedDocumentNode<
  unknown,
  { id: string; input: UpdateChallengeToolPresetInput }
> = gql`
  mutation UpdateChallengeToolPreset($id: ID!, $input: UpdateChallengeToolPresetInput!) {
    updateChallengeToolPreset(id: $id, input: $input) {
      id
      name
      config_json
      version
      is_active
    }
  }
`;

export const DUPLICATE_CHALLENGE_TOOL_PRESET: TypedDocumentNode<unknown, { id: string }> = gql`
  mutation DuplicateChallengeToolPreset($id: ID!) {
    duplicateChallengeToolPreset(id: $id) {
      id
    }
  }
`;

export const CHALLENGE_CATEGORY_MAPPINGS: TypedDocumentNode<{ challengeCategoryMappings: MappingRow[] }> = gql`
  query ChallengeCategoryMappings {
    challengeCategoryMappings {
      id
      category_id
      category_name
      level
      enabled
      allowed_tool_ids
      default_template_id
      updated_at
    }
  }
`;

/** Every category with its parent, to label nodes with their full path. */
export const CATEGORY_TREE_NODES: TypedDocumentNode<{ categories: CategoryNode[] }> = gql`
  query CategoryTreeNodes {
    categories {
      id
      name
      level
      parent_id
    }
  }
`;
