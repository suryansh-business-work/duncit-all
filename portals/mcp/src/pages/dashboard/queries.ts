import { gql } from '@apollo/client';
import type { McpUsageBucket, McpUsageSummary, McpUsageTotals } from '@duncit/gql-types';

/**
 * The dashboard's one request: the usage summary for the window, plus the
 * newest call's currency. Every call is priced when it is recorded, in the
 * currency Settings named then, and the summary itself carries no currency —
 * so the newest call is what says which one the totals are in.
 */
export const MCP_USAGE_DASHBOARD = gql`
  fragment McpDashboardBucket on McpUsageBucket {
    key
    calls
    errors
    blocked
    input_tokens
    output_tokens
    cost
    avg_ms
    last_at
  }

  query McpUsageDashboard($from: String, $to: String, $user_id: ID) {
    mcpUsageSummary(from: $from, to: $to, user_id: $user_id) {
      scope
      totals {
        calls
        errors
        blocked
        users
        input_tokens
        output_tokens
        cost
        avg_ms
      }
      by_day {
        key
        calls
        errors
      }
      by_tool {
        ...McpDashboardBucket
      }
      by_category {
        ...McpDashboardBucket
      }
      by_client {
        ...McpDashboardBucket
      }
      by_endpoint {
        ...McpDashboardBucket
      }
      by_status {
        ...McpDashboardBucket
      }
      by_user {
        ...McpDashboardBucket
      }
    }
    latestCall: mcpToolCallsTable(query: { page: 1, page_size: 1 }) {
      rows {
        id
        currency
      }
    }
  }
`;

/**
 * A person's id from their email — the summary's per-person buckets are keyed
 * by email, and narrowing the summary to one person takes their id.
 */
export const MCP_PERSON_LOOKUP = gql`
  query McpPersonLookup($email: String!) {
    mcpToolCallsTable(query: { page: 1, page_size: 1, filters: [{ field: "user_email", op: eq, value: $email }] }) {
      rows {
        id
        user_id
      }
    }
  }
`;

export type UsageBucket = Omit<McpUsageBucket, '__typename'>;
export type UsageDay = Pick<McpUsageBucket, 'key' | 'calls' | 'errors'>;
export type UsageTotals = Omit<McpUsageTotals, '__typename' | 'last_at'>;

export interface UsageDashboard extends Pick<McpUsageSummary, 'scope'> {
  totals: UsageTotals;
  by_day: UsageDay[];
  by_tool: UsageBucket[];
  by_category: UsageBucket[];
  by_client: UsageBucket[];
  by_endpoint: UsageBucket[];
  by_status: UsageBucket[];
  by_user: UsageBucket[];
}

export interface UsageDashboardData {
  mcpUsageSummary: UsageDashboard;
  latestCall: { rows: Array<{ id: string; currency: string }> };
}

export interface UsageDashboardVars {
  from: string;
  to: string;
  user_id: string | null;
}

export interface PersonLookupData {
  mcpToolCallsTable: { rows: Array<{ id: string; user_id: string }> };
}
