import { gql } from '@apollo/client';

export type StressRunStatus = 'QUEUED' | 'RUNNING' | 'STOPPING' | 'COMPLETED' | 'ABORTED' | 'FAILED';

export const LIVE_STATUSES: ReadonlySet<StressRunStatus> = new Set(['QUEUED', 'RUNNING', 'STOPPING']);

export const isLiveRun = (status: StressRunStatus) => LIVE_STATUSES.has(status);

export interface StressProfile {
  virtual_users: number;
  browser_bots: number;
  runners: number;
  ramp_up_seconds: number;
  hold_seconds: number;
  ramp_down_seconds: number;
  think_time_ms: number;
  journeys: string[];
}

export interface StressPeaks {
  virtual_users: number;
  browser_bots: number;
  rps: number;
  p95_ms: number;
  error_rate_pct: number;
  host_cpu_pct: number;
  host_memory_pct: number;
  event_loop_lag_ms: number;
  real_users: number;
}

export interface StressSummary {
  requests: number;
  errors: number;
  error_rate_pct: number;
  avg_rps: number;
  avg_ms: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  navigations: number;
  navigation_errors: number;
  avg_page_load_ms: number;
}

export interface StressEndpoint {
  key: string;
  requests: number;
  errors: number;
  avg_ms: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
}

export interface StressEvent {
  at: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  source: string;
  message: string;
}

export interface StressRun {
  id: string;
  run_no: string;
  status: StressRunStatus;
  environment: string;
  target_mweb_url: string;
  target_graphql_url: string;
  profile: StressProfile;
  triggered_by: string;
  workflow_run_url: string;
  ref: string;
  started_at: string | null;
  ended_at: string | null;
  stop_requested_at: string | null;
  stop_reason: string;
  last_report_at: string | null;
  duration_seconds: number | null;
  peaks: StressPeaks;
  summary: StressSummary | null;
  endpoints: StressEndpoint[];
  shards_finished: number;
  events: StressEvent[];
  error_message: string;
  created_at: string | null;
}

export interface StressLoadSample {
  active_vus: number;
  active_bots: number;
  rps: number;
  error_rate_pct: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  requests: number;
  errors: number;
  navigations: number;
  page_load_ms: number;
}

export interface StressServerSample {
  host_cpu_pct: number;
  host_memory_pct: number;
  load_avg_1: number;
  event_loop_lag_ms: number;
  heap_used_mb: number;
  rss_mb: number;
  rps_total: number;
  rps_stress: number;
  in_flight: number;
  server_p95_ms: number;
  status_5xx: number;
  sockets: number;
  real_users: number;
  visitors: number;
}

export interface StressContainerSample {
  name: string;
  cpu_pct: number;
  memory_mb: number;
  memory_pct: number;
}

export interface StressSample {
  at: string;
  load: StressLoadSample;
  server: StressServerSample;
  containers: StressContainerSample[];
}

export interface StressBot {
  bot: string;
  kind: 'HTTP' | 'BROWSER';
  journey: string;
  page: string;
  status: string;
  load_ms: number;
  at: string;
}

export interface StressShard {
  shard: number;
  phase: string;
  elapsed_seconds: number;
  active_vus: number;
  active_bots: number;
  requests: number;
  errors: number;
  p95_ms: number;
  status_counts: Array<{ code: string; count: number }>;
  bots: StressBot[];
  received_at: string;
}

export interface ServerPulse {
  at: string;
  host_cpu_pct: number;
  host_memory_pct: number;
  load_avg_1: number;
  event_loop_lag_ms: number;
  event_loop_p99_ms: number;
  heap_used_mb: number;
  rss_mb: number;
  rps_total: number;
  rps_stress: number;
  in_flight: number;
  server_p95_ms: number;
  status_5xx: number;
  sockets: number;
  real_users: number;
  visitors: number;
  users_by_surface: Array<{ surface: string; users: number }>;
  uptime_seconds: number;
}

export interface StressSettings {
  max_virtual_users: number;
  max_browser_bots: number;
  max_runners: number;
  max_duration_minutes: number;
  abort_error_rate_pct: number;
  abort_p95_ms: number;
  abort_host_cpu_pct: number;
  abort_breach_samples: number;
  sample_retention_days: number;
  updated_at: string | null;
}

export interface StressTriggerConfig {
  configured: boolean;
  blocked_reason: '' | 'LOCAL' | 'TARGET' | 'GITHUB';
  environment: string;
  requires_confirmation: boolean;
  confirm_text: string;
  can_start: boolean;
  live_run_no: string | null;
  target_mweb_url: string;
  target_graphql_url: string;
  repository: string;
  ref: string;
  journeys: string[];
  limits: StressSettings;
}

const SETTINGS_FIELDS = `
  max_virtual_users max_browser_bots max_runners max_duration_minutes
  abort_error_rate_pct abort_p95_ms abort_host_cpu_pct abort_breach_samples
  sample_retention_days updated_at
`;

const RUN_FIELDS = `
  id run_no status environment target_mweb_url target_graphql_url
  profile { virtual_users browser_bots runners ramp_up_seconds hold_seconds ramp_down_seconds think_time_ms journeys }
  triggered_by workflow_run_url ref started_at ended_at stop_requested_at stop_reason last_report_at duration_seconds
  peaks { virtual_users browser_bots rps p95_ms error_rate_pct host_cpu_pct host_memory_pct event_loop_lag_ms real_users }
  summary { requests errors error_rate_pct avg_rps avg_ms p50_ms p95_ms p99_ms navigations navigation_errors avg_page_load_ms }
  shards_finished error_message created_at
`;

export const STRESS_RUNS_TABLE = gql`
  query StressRunsTable($query: TableQueryInput) {
    stressRunsTable(query: $query) {
      rows { ${RUN_FIELDS} }
      total
      page
      page_size
    }
  }
`;

export const STRESS_RUN = gql`
  query StressRun($id: ID!) {
    stressRun(id: $id) {
      ${RUN_FIELDS}
      endpoints { key requests errors avg_ms p50_ms p95_ms p99_ms }
      events { at level source message }
    }
  }
`;

export const STRESS_RUN_SAMPLES = gql`
  query StressRunSamples($id: ID!) {
    stressRunSamples(id: $id) {
      at
      load { active_vus active_bots rps error_rate_pct p50_ms p95_ms p99_ms requests errors navigations page_load_ms }
      server {
        host_cpu_pct host_memory_pct load_avg_1 event_loop_lag_ms heap_used_mb rss_mb rps_total rps_stress
        in_flight server_p95_ms status_5xx sockets real_users visitors
      }
      containers { name cpu_pct memory_mb memory_pct }
    }
  }
`;

export const STRESS_RUN_SHARDS = gql`
  query StressRunShards($id: ID!) {
    stressRunShards(id: $id) {
      shard phase elapsed_seconds active_vus active_bots requests errors p95_ms received_at
      status_counts { code count }
      bots { bot kind journey page status load_ms at }
    }
  }
`;

export const SERVER_PULSE = gql`
  query ServerPulse {
    serverPulse {
      at host_cpu_pct host_memory_pct load_avg_1 event_loop_lag_ms event_loop_p99_ms heap_used_mb rss_mb
      rps_total rps_stress in_flight server_p95_ms status_5xx sockets real_users visitors uptime_seconds
      users_by_surface { surface users }
    }
  }
`;

export const STRESS_TRIGGER_CONFIG = gql`
  query StressTriggerConfig {
    stressTriggerConfig {
      configured blocked_reason environment requires_confirmation confirm_text can_start live_run_no
      target_mweb_url target_graphql_url repository ref journeys
      limits { ${SETTINGS_FIELDS} }
    }
  }
`;

export const STRESS_SETTINGS = gql`
  query StressSettings {
    stressSettings { ${SETTINGS_FIELDS} }
  }
`;

export const UPDATE_STRESS_SETTINGS = gql`
  mutation UpdateStressSettings($input: UpdateStressSettingsInput!) {
    updateStressSettings(input: $input) { ${SETTINGS_FIELDS} }
  }
`;

export const TRIGGER_STRESS_RUN = gql`
  mutation TriggerStressRun($input: TriggerStressRunInput!) {
    triggerStressRun(input: $input) { id run_no status }
  }
`;

export const STOP_STRESS_RUN = gql`
  mutation StopStressRun($id: ID!) {
    stopStressRun(id: $id) { id status stop_reason }
  }
`;

export const DELETE_STRESS_RUN = gql`
  mutation DeleteStressRun($id: ID!) {
    deleteStressRun(id: $id)
  }
`;
