import { gql } from '@apollo/client';

export const TELEMETRY_DASHBOARD = gql`
  query TelemetryDashboard($range_days: Int) {
    telemetryDashboard(range_days: $range_days) {
      range_days
      total_logs
      active_bugs
      by_level {
        key
        count
      }
      by_source {
        key
        count
      }
      by_environment {
        key
        count
      }
      series {
        date
        count
      }
      top_bugs {
        id
        title
        source
        page
        occurrence_count
        status
      }
    }
  }
`;

export const TELEMETRY_LOGS_TABLE = gql`
  query TelemetryLogsTable($query: TableQueryInput) {
    telemetryLogsTable(query: $query) {
      total
      rows {
        id
        source
        level
        page
        component
        environment
        created_at
        error {
          name
          message
        }
      }
    }
  }
`;

export interface CountBucket {
  key: string;
  count: number;
}

export interface TopBug {
  id: string;
  title: string;
  source: string;
  page: string;
  occurrence_count: number;
  status: string;
}

export interface TelemetryDashboardData {
  range_days: number;
  total_logs: number;
  active_bugs: number;
  by_level: CountBucket[];
  by_source: CountBucket[];
  by_environment: CountBucket[];
  series: Array<{ date: string; count: number }>;
  top_bugs: TopBug[];
}

export interface LogRow {
  id: string;
  source: string;
  level: string;
  page: string;
  component: string;
  environment: string;
  created_at: string;
  error: { name: string; message: string } | null;
}

export const RANGE_OPTIONS = [
  { value: 1, label: 'Last 24h' },
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
] as const;

const LEVEL_COLOR: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  error: 'error',
  warn: 'warning',
  info: 'info',
  debug: 'default',
};

export const levelColor = (level: string) => LEVEL_COLOR[level] ?? 'default';
