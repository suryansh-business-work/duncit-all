import { gql } from '@apollo/client';

/**
 * The Prompt Library's GraphQL surface.
 *
 * The selection is written out rather than interpolated from a shared
 * constant: only one query needs it, and an interpolated fragment in a `gql`
 * template is a known way to take a portal down at module load if the chunk
 * ever grows a brace of its own.
 */
export const AI_PROMPTS = gql`
  query AiPrompts($filter: AiPromptFilter) {
    aiPrompts(filter: $filter) {
      id
      key
      kind
      role
      name
      description
      content
      category
      target_model
      variables {
        name
        label
        description
        required
        example
      }
      tasks
      usage {
        file
        surface
        trigger
      }
      token_count
      is_active
      created_at
      updated_at
    }
  }
`;

export const CREATE_AI_PROMPT = gql`
  mutation CreateAiPrompt($input: CreateAiPromptInput!) {
    createAiPrompt(input: $input) {
      id
    }
  }
`;

export const UPDATE_AI_PROMPT = gql`
  mutation UpdateAiPrompt($id: ID!, $input: UpdateAiPromptInput!) {
    updateAiPrompt(id: $id, input: $input) {
      id
    }
  }
`;

export const DELETE_AI_PROMPT = gql`
  mutation DeleteAiPrompt($id: ID!) {
    deleteAiPrompt(id: $id)
  }
`;

export const RESET_AI_PROMPT = gql`
  mutation ResetAiPrompt($id: ID!) {
    resetAiPrompt(id: $id) {
      id
      content
    }
  }
`;
