import { gql } from '@apollo/client';

export interface AiPrompt {
  id: string;
  name: string;
  description?: string | null;
  content: string;
  category: string;
  target_model: string;
  token_count: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export const AI_PROMPTS = gql`
  query AiPrompts($filter: AiPromptFilter) {
    aiPrompts(filter: $filter) {
      id
      name
      description
      content
      category
      target_model
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
