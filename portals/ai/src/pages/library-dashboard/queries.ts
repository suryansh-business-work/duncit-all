import { gql } from '@apollo/client';

/** How many prompts of each kind share one value (a category, a model). */
export interface LibraryCount {
  /** An empty model means the configured default. */
  key: string;
  code: number;
  ai: number;
}

/** One prompt with the usage of the AI features it serves. */
export interface LibraryPromptStat {
  id: string;
  key: string | null;
  kind: 'CODE' | 'AI';
  role: 'SYSTEM' | 'USER';
  name: string;
  category: string;
  target_model: string;
  token_count: number;
  is_active: boolean;
  matches_default: boolean | null;
  updated_at: string | null;
  features: string[];
  calls: number;
  failed_calls: number;
  total_tokens: number;
  cost_usd: number;
}

export interface LibraryDashboard {
  range_days: number;
  code_prompts: number;
  system_prompts: number;
  user_prompts: number;
  ai_prompts: number;
  active_ai_prompts: number;
  edited_code_prompts: number;
  missing_code_prompts: number;
  features_total: number;
  features_with_prompt: number;
  by_category: LibraryCount[];
  by_model: LibraryCount[];
  prompts: LibraryPromptStat[];
}

export const AI_LIBRARY_DASHBOARD = gql`
  query AiLibraryDashboard($range_days: Int) {
    aiLibraryDashboard(range_days: $range_days) {
      range_days
      code_prompts
      system_prompts
      user_prompts
      ai_prompts
      active_ai_prompts
      edited_code_prompts
      missing_code_prompts
      features_total
      features_with_prompt
      by_category {
        key
        code
        ai
      }
      by_model {
        key
        code
        ai
      }
      prompts {
        id
        key
        kind
        role
        name
        category
        target_model
        token_count
        is_active
        matches_default
        updated_at
        features
        calls
        failed_calls
        total_tokens
        cost_usd
      }
    }
  }
`;
