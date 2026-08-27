import { gql } from '@apollo/client';

/**
 * Everything the Rate Limiting console reads and writes.
 *
 * The rule selection is a fragment because the same shape is needed by the
 * table, the editor and every mutation's return — three hand-kept copies of a
 * twenty-field selection is three chances for the editor to open with a field
 * the table never fetched.
 */
export const RULE_FIELDS = gql`
  fragment RateLimitRuleFields on RateLimitRule {
    id
    name
    description
    enabled
    mode
    priority
    surface
    app
    channel
    audience
    operations
    operation_type
    paths
    methods
    key_by
    algorithm
    limit
    window_seconds
    burst
    block_seconds
    exempt_roles
    exempt_ips
    message
    notify_slack
    hit_count
    blocked_count
    last_blocked_at
    updated_at
  }
`;

export const RULES_TABLE = gql`
  ${RULE_FIELDS}
  query RateLimitRulesTable($query: TableQueryInput) {
    rateLimitRulesTable(query: $query) {
      total
      rows {
        ...RateLimitRuleFields
      }
    }
  }
`;

export const EVENTS_TABLE = gql`
  query RateLimitEventsTable($query: TableQueryInput) {
    rateLimitEventsTable(query: $query) {
      total
      rows {
        id
        rule_id
        rule_name
        mode
        surface
        app
        channel
        operation
        path
        method
        limit_key
        key_by
        ip
        user_email
        count
        limit
        retry_after
        created_at
      }
    }
  }
`;

export const SYSTEMS = gql`
  query RateLimitSystems {
    rateLimitSystems {
      id
      surface
      app
      label
      requests
      blocked
      rule_count
      last_seen_at
    }
  }
`;

export const STATS = gql`
  query RateLimitStats {
    rateLimitStats {
      store
      blocked_24h
      monitored_24h
      top_rules {
        label
        count
      }
      top_systems {
        label
        count
      }
    }
  }
`;

export const OPTIONS = gql`
  query RateLimitOptions {
    rateLimitOptions {
      surfaces
      channels
      key_by
      algorithms
      modes
      audiences
      operation_types
      apps {
        surface
        app
        label
      }
      roles {
        key
        name
      }
    }
  }
`;

export const SETTINGS = gql`
  query RateLimitSettings {
    rateLimitSettings {
      enabled
      monitor_only
      default_message
      send_headers
      log_blocks
      notify_slack
      exempt_roles
      allow_ips
      block_ips
      event_retention_days
      store
      rule_count
      active_rule_count
      event_count
      updated_at
    }
  }
`;

export const UPDATE_SETTINGS = gql`
  mutation UpdateRateLimitSettings($input: RateLimitSettingsInput!) {
    updateRateLimitSettings(input: $input) {
      enabled
      updated_at
    }
  }
`;

export const CREATE_RULE = gql`
  mutation CreateRateLimitRule($input: RateLimitRuleInput!) {
    createRateLimitRule(input: $input) {
      id
    }
  }
`;

export const UPDATE_RULE = gql`
  mutation UpdateRateLimitRule($rule_id: ID!, $input: RateLimitRuleInput!) {
    updateRateLimitRule(rule_id: $rule_id, input: $input) {
      id
    }
  }
`;

export const SET_RULE_ENABLED = gql`
  mutation SetRateLimitRuleEnabled($rule_id: ID!, $enabled: Boolean!) {
    setRateLimitRuleEnabled(rule_id: $rule_id, enabled: $enabled) {
      id
      enabled
    }
  }
`;

export const DELETE_RULE = gql`
  mutation DeleteRateLimitRule($rule_id: ID!) {
    deleteRateLimitRule(rule_id: $rule_id)
  }
`;

export const RESET_COUNTERS = gql`
  mutation ResetRateLimitCounters {
    resetRateLimitCounters
  }
`;

export const CLEAR_EVENTS = gql`
  mutation ClearRateLimitEvents {
    clearRateLimitEvents
  }
`;

export interface RateLimitRuleRow {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  mode: string;
  priority: number;
  surface: string;
  app: string;
  channel: string;
  audience: string;
  operations: string[];
  operation_type: string;
  paths: string[];
  methods: string[];
  key_by: string;
  algorithm: string;
  limit: number;
  window_seconds: number;
  burst: number;
  block_seconds: number;
  exempt_roles: string[];
  exempt_ips: string[];
  message: string | null;
  notify_slack: boolean;
  hit_count: number;
  blocked_count: number;
  last_blocked_at: string | null;
  updated_at: string | null;
}

export interface RateLimitEventRow {
  id: string;
  rule_id: string;
  rule_name: string;
  mode: string;
  surface: string;
  app: string;
  channel: string;
  operation: string | null;
  path: string | null;
  method: string | null;
  limit_key: string;
  key_by: string;
  ip: string | null;
  user_email: string | null;
  count: number;
  limit: number;
  retry_after: number;
  created_at: string | null;
}

export interface RateLimitSystemRow {
  id: string;
  surface: string;
  app: string;
  label: string;
  requests: number;
  blocked: number;
  rule_count: number;
  last_seen_at: string | null;
}

export interface RateLimitOptionsData {
  surfaces: string[];
  channels: string[];
  key_by: string[];
  algorithms: string[];
  modes: string[];
  audiences: string[];
  operation_types: string[];
  apps: Array<{ surface: string; app: string; label: string }>;
  roles: Array<{ key: string; name: string }>;
}
