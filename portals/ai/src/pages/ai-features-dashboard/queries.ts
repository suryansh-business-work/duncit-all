import { gql } from '@apollo/client';

/** One day of AI feature calls, in the admin's time zone. */
export interface FeatureDay {
  date: string;
  calls: number;
  failed_calls: number;
  skipped_calls: number;
  total_tokens: number;
  cost_usd: number;
  avg_duration_ms: number;
}

/** One owning area's features and what they used. */
export interface FeatureArea {
  module: string;
  features: number;
  enabled: number;
  calls: number;
  failed_calls: number;
  total_tokens: number;
  cost_usd: number;
  avg_duration_ms: number;
}

/** The per-feature fields the dashboard ranks by. */
export interface DashboardFeature {
  key: string;
  label: string;
  module: string;
  enabled: boolean;
  calls: number;
  failed_calls: number;
  skipped_calls: number;
  total_tokens: number;
  cost_usd: number;
  avg_duration_ms: number;
}

export interface FeaturesDashboard {
  range_days: number;
  features_total: number;
  features_enabled: number;
  features_used: number;
  calls: number;
  failed_calls: number;
  skipped_calls: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  avg_duration_ms: number;
  unpriced_calls: number;
  by_area: FeatureArea[];
  series: FeatureDay[];
  features: DashboardFeature[];
}

/** One request: totals and areas are summed on the server from the same feature rows. */
export const AI_FEATURES_DASHBOARD = gql`
  query AiFeaturesDashboard($range_days: Int) {
    aiFeaturesDashboard(range_days: $range_days) {
      range_days
      features_total
      features_enabled
      features_used
      calls
      failed_calls
      skipped_calls
      prompt_tokens
      completion_tokens
      total_tokens
      cost_usd
      avg_duration_ms
      unpriced_calls
      by_area {
        module
        features
        enabled
        calls
        failed_calls
        total_tokens
        cost_usd
        avg_duration_ms
      }
      series {
        date
        calls
        failed_calls
        skipped_calls
        total_tokens
        cost_usd
        avg_duration_ms
      }
      features {
        key
        label
        module
        enabled
        calls
        failed_calls
        skipped_calls
        total_tokens
        cost_usd
        avg_duration_ms
      }
    }
  }
`;
