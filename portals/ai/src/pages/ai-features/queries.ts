import { gql } from '@apollo/client';

/** One AI feature with its switch and its usage over the selected range. */
export interface AiFeature {
  key: string;
  label: string;
  module: string;
  description: string;
  when_off: string;
  enabled: boolean;
  updated_by_name: string | null;
  updated_at: string | null;
  range_days: number;
  calls: number;
  failed_calls: number;
  skipped_calls: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  avg_duration_ms: number;
  unpriced_calls: number;
  last_called_at: string | null;
}

const AI_FEATURE_FIELDS = gql`
  fragment AiFeatureFields on AiFeature {
    key
    label
    module
    description
    when_off
    enabled
    updated_by_name
    updated_at
    range_days
    calls
    failed_calls
    skipped_calls
    prompt_tokens
    completion_tokens
    total_tokens
    cost_usd
    avg_duration_ms
    unpriced_calls
    last_called_at
  }
`;

export const AI_FEATURES = gql`
  query AiFeatures($range_days: Int) {
    aiFeatures(range_days: $range_days) {
      ...AiFeatureFields
    }
  }
  ${AI_FEATURE_FIELDS}
`;

export const AI_FEATURE_ONE = gql`
  query AiFeature($key: String!, $range_days: Int) {
    aiFeature(key: $key, range_days: $range_days) {
      ...AiFeatureFields
    }
  }
  ${AI_FEATURE_FIELDS}
`;

export const SET_AI_FEATURE_ENABLED = gql`
  mutation SetAiFeatureEnabled($key: String!, $enabled: Boolean!) {
    setAiFeatureEnabled(key: $key, enabled: $enabled) {
      key
      enabled
      updated_by_name
      updated_at
    }
  }
`;

/** Range presets in days. 90 is the server's cap; the usage log keeps 180. */
export const FEATURE_RANGE_DAYS = [1, 7, 30, 90] as const;
export const DEFAULT_FEATURE_RANGE = 30;
