import { gql } from '@apollo/client';

export const OPENAI_USAGE_DASHBOARD = gql`
  query OpenAiUsageDashboard($range_days: Int) {
    openAiUsageDashboard(range_days: $range_days) {
      range_days
      total_calls
      success_calls
      failed_calls
      skipped_calls
      prompt_tokens
      completion_tokens
      total_tokens
      total_cost_usd
      avg_duration_ms
      all_time_calls
      all_time_cost_usd
      by_task {
        task
        label
        module
        calls
        tokens
        cost_usd
        failures
        avg_duration_ms
      }
      by_module {
        key
        calls
        tokens
        cost_usd
      }
      by_model {
        key
        calls
        tokens
        cost_usd
      }
      series {
        date
        calls
        tokens
        cost_usd
      }
      unpriced_models
      prices {
        id
        model
        input_per_1m
        output_per_1m
        updated_at
      }
    }
  }
`;

export const UPSERT_OPENAI_MODEL_PRICE = gql`
  mutation UpsertOpenAiModelPrice($input: OpenAiModelPriceInput!) {
    upsertOpenAiModelPrice(input: $input) {
      id
      model
      input_per_1m
      output_per_1m
      updated_at
    }
  }
`;

export interface SpendBucket {
  key: string;
  calls: number;
  tokens: number;
  cost_usd: number;
}

export interface TaskSpend {
  task: string;
  label: string;
  module: string;
  calls: number;
  tokens: number;
  cost_usd: number;
  failures: number;
  avg_duration_ms: number;
}

export interface SpendPoint {
  date: string;
  calls: number;
  tokens: number;
  cost_usd: number;
}

export interface ModelPrice {
  id: string;
  model: string;
  input_per_1m: number;
  output_per_1m: number;
  updated_at: string;
}

export interface UsageDashboardData {
  range_days: number;
  total_calls: number;
  success_calls: number;
  failed_calls: number;
  skipped_calls: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  total_cost_usd: number;
  avg_duration_ms: number;
  all_time_calls: number;
  all_time_cost_usd: number;
  by_task: TaskSpend[];
  by_module: SpendBucket[];
  by_model: SpendBucket[];
  series: SpendPoint[];
  unpriced_models: string[];
  prices: ModelPrice[];
}

export const RANGE_OPTIONS = [
  { value: 1, label: 'Last 24h' },
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
] as const;
