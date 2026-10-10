import { gql, type TypedDocumentNode } from '@apollo/client';
import type {
  ChallengeCategoryMapping,
  ChallengeCategoryMappingInput,
  ChallengeTool,
  ChallengeToolPreset,
} from '@duncit/gql-types';

export interface MappingEditorData {
  challengeCategoryMapping: ChallengeCategoryMapping;
  challengeTools: Pick<ChallengeTool, 'id' | 'name' | 'status' | 'engine_ready'>[];
  challengeToolPresets: Pick<ChallengeToolPreset, 'id' | 'tool_id' | 'name' | 'is_active'>[];
  challenges: { id: string; name: string; is_active: boolean; tool_instances: { tool_id: string }[] }[];
}

type MappingResult<K extends string> = Record<K, ChallengeCategoryMapping>;

/** The fields every mapping editor reads back after a save. */
export const CHALLENGE_MAPPING_FIELDS = gql`
  fragment ChallengeMappingFields on ChallengeCategoryMapping {
    id
    category_id
    category_name
    level
    source_category_id
    inherited
    enabled
    allowed_tool_ids
    preset_ids
    default_template_id
    allow_host_customization
    show_on_pod_details_default
    allow_audience_voting
    require_challenge
    max_competitors
    updated_at
  }
`;

/** The effective mapping for one category, plus the options the editor offers. */
export const CHALLENGE_MAPPING_EDITOR: TypedDocumentNode<MappingEditorData, { categoryId: string }> = gql`
  ${CHALLENGE_MAPPING_FIELDS}
  query ChallengeMappingEditor($categoryId: ID!) {
    challengeCategoryMapping(category_id: $categoryId) {
      ...ChallengeMappingFields
    }
    challengeTools {
      id
      name
      status
      engine_ready
    }
    challengeToolPresets {
      id
      tool_id
      name
      is_active
    }
    challenges {
      id
      name
      is_active
      tool_instances {
        tool_id
      }
    }
  }
`;

export const UPSERT_CHALLENGE_MAPPING: TypedDocumentNode<
  MappingResult<'upsertChallengeCategoryMapping'>,
  { categoryId: string; input: ChallengeCategoryMappingInput }
> = gql`
  ${CHALLENGE_MAPPING_FIELDS}
  mutation UpsertChallengeMapping($categoryId: ID!, $input: ChallengeCategoryMappingInput!) {
    upsertChallengeCategoryMapping(category_id: $categoryId, input: $input) {
      ...ChallengeMappingFields
    }
  }
`;

export const CLEAR_CHALLENGE_MAPPING: TypedDocumentNode<
  MappingResult<'clearChallengeCategoryMapping'>,
  { categoryId: string }
> = gql`
  ${CHALLENGE_MAPPING_FIELDS}
  mutation ClearChallengeMapping($categoryId: ID!) {
    clearChallengeCategoryMapping(category_id: $categoryId) {
      ...ChallengeMappingFields
    }
  }
`;
