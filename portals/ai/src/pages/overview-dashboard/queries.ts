import { gql } from '@apollo/client';
import type { AiOverviewChange, AiOverviewTotals } from '@duncit/gql-types';
import type { OpenAiLogRow } from '../openai-logs/queries';

/** How often the Dashboard reads itself again while it is open. */
export const OVERVIEW_POLL_MS = 60_000;

/** One window's OpenAI usage — the generated `AiOverviewTotals`. */
export type OverviewTotals = Omit<AiOverviewTotals, '__typename'>;

/**
 * Percent change against the previous window; null when it had nothing to
 * compare with. Every field is selected, so none is ever absent.
 */
export type OverviewChange = Required<Omit<AiOverviewChange, '__typename'>>;

/** One day of the window, in the admin's time zone. */
export interface OverviewDay {
  date: string;
  calls: number;
  success_calls: number;
  failed_calls: number;
  skipped_calls: number;
  total_tokens: number;
  cost_usd: number;
  avg_duration_ms: number;
  active_users: number;
}

export interface OverviewModel {
  model: string;
  calls: number;
  failed_calls: number;
  failure_rate: number;
  total_tokens: number;
  cost_usd: number;
  avg_duration_ms: number;
}

export interface OverviewFeature {
  key: string;
  label: string;
  module: string;
  calls: number;
  failed_calls: number;
  total_tokens: number;
  cost_usd: number;
  avg_duration_ms: number;
}

export interface OverviewModule {
  module: string;
  calls: number;
  cost_usd: number;
}

export interface OverviewUser {
  user_id: string;
  name: string;
  calls: number;
  cost_usd: number;
}

export interface OverviewCount {
  key: string;
  count: number;
}

export interface OverviewMonitoring {
  scanned: number;
  flagged: number;
  blocked: number;
  failed: number;
  by_risk: OverviewCount[];
}

export interface OverviewAutomation {
  runs: number;
  completed: number;
  failed: number;
  in_progress: number;
  by_status: OverviewCount[];
  active_flows: number;
  total_flows: number;
}

/** One recent call — the same fields the logs table shows, so the log drawer opens on it. */
export type OverviewActivity = Pick<
  OpenAiLogRow,
  'id' | 'task_label' | 'model' | 'status' | 'total_tokens' | 'cost_usd' | 'duration_ms' | 'error_message' | 'created_at'
>;

export interface OverviewDashboard {
  range_days: number;
  generated_at: string;
  totals: OverviewTotals;
  change: OverviewChange;
  series: OverviewDay[];
  by_model: OverviewModel[];
  by_feature: OverviewFeature[];
  by_module: OverviewModule[];
  features_total: number;
  features_enabled: number;
  top_users: OverviewUser[];
  monitoring: OverviewMonitoring;
  automation: OverviewAutomation;
  recent: OverviewActivity[];
}

export interface AiOverviewDashboardQuery {
  aiOverviewDashboard: OverviewDashboard;
}

/** The whole Dashboard in one request; the server sums it from the logs it already keeps. */
export const AI_OVERVIEW_DASHBOARD = gql`
  query AiOverviewDashboard($range_days: Int) {
    aiOverviewDashboard(range_days: $range_days) {
      range_days
      generated_at
      totals {
        calls
        success_calls
        failed_calls
        skipped_calls
        error_rate
        prompt_tokens
        completion_tokens
        total_tokens
        cost_usd
        avg_duration_ms
        active_users
        unpriced_calls
      }
      change {
        calls
        cost_usd
        total_tokens
        active_users
        avg_duration_ms
        error_rate_points
      }
      series {
        date
        calls
        success_calls
        failed_calls
        skipped_calls
        total_tokens
        cost_usd
        avg_duration_ms
        active_users
      }
      by_model {
        model
        calls
        failed_calls
        failure_rate
        total_tokens
        cost_usd
        avg_duration_ms
      }
      by_feature {
        key
        label
        module
        calls
        failed_calls
        total_tokens
        cost_usd
        avg_duration_ms
      }
      by_module {
        module
        calls
        cost_usd
      }
      features_total
      features_enabled
      top_users {
        user_id
        name
        calls
        cost_usd
      }
      monitoring {
        scanned
        flagged
        blocked
        failed
        by_risk {
          key
          count
        }
      }
      automation {
        runs
        completed
        failed
        in_progress
        by_status {
          key
          count
        }
        active_flows
        total_flows
      }
      recent {
        id
        task_label
        model
        status
        total_tokens
        cost_usd
        duration_ms
        error_message
        created_at
      }
    }
  }
`;
