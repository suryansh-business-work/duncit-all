import { gql } from '@apollo/client';
import type { IntelAuditPage, IntelConnector, IntelEntryOption, IntelHealth, IntelIndexPage, IntelIndexStat, IntelSettingsPayload, IntelSlackChannel, IntelSyncRun, IntelTestResult, IntelUsage } from '@duncit/gql-types';

/** Settings, connectors, sync, index, health, audit and usage documents (Admin and above). */

export const INTEL_SETTINGS = gql`
  query IntelSettings {
    intelSettings {
      revision
      json
    }
  }
`;

export const INTEL_UPDATE_SETTINGS = gql`
  mutation IntelUpdateSettings($section: String!, $value: String!, $revision: Int!) {
    intelUpdateSettings(section: $section, value: $value, revision: $revision) {
      revision
      json
    }
  }
`;

export const INTEL_ENTRY_OPTIONS = gql`
  query IntelEntryOptions($kind: String!) {
    intelEntryOptions(kind: $kind) {
      id
      name
      description
      is_default
      last_test_ok
    }
  }
`;

export const CONNECTOR_FIELDS = gql`
  fragment IntelConnectorFields on IntelConnector {
    id
    kind
    name
    environment
    env_entry_id
    env_entry_name
    enabled
    config
    status
    sync_paused
    last_sync_at
    last_success_at
    last_error
    indexed_count
    created_at
    updated_at
    tools {
      name
      description
      class
      override
      effective
      input_schema
    }
  }
`;

export const INTEL_CONNECTORS = gql`
  query IntelConnectors($kind: String) {
    intelConnectors(kind: $kind) {
      ...IntelConnectorFields
    }
  }
  ${CONNECTOR_FIELDS}
`;

export const INTEL_CREATE_CONNECTOR = gql`
  mutation IntelCreateConnector($input: IntelConnectorInput!) {
    intelCreateConnector(input: $input) {
      ...IntelConnectorFields
    }
  }
  ${CONNECTOR_FIELDS}
`;

export const INTEL_UPDATE_CONNECTOR = gql`
  mutation IntelUpdateConnector($id: ID!, $input: IntelConnectorInput!) {
    intelUpdateConnector(id: $id, input: $input) {
      ...IntelConnectorFields
    }
  }
  ${CONNECTOR_FIELDS}
`;

export const INTEL_DELETE_CONNECTOR = gql`
  mutation IntelDeleteConnector($id: ID!) {
    intelDeleteConnector(id: $id)
  }
`;

export const INTEL_SET_CONNECTOR_ENABLED = gql`
  mutation IntelSetConnectorEnabled($id: ID!, $enabled: Boolean!) {
    intelSetConnectorEnabled(id: $id, enabled: $enabled) {
      ...IntelConnectorFields
    }
  }
  ${CONNECTOR_FIELDS}
`;

export const INTEL_SET_CONNECTOR_PAUSED = gql`
  mutation IntelSetConnectorPaused($id: ID!, $paused: Boolean!) {
    intelSetConnectorPaused(id: $id, paused: $paused) {
      ...IntelConnectorFields
    }
  }
  ${CONNECTOR_FIELDS}
`;

export const INTEL_TEST_CONNECTOR = gql`
  mutation IntelTestConnector($id: ID!) {
    intelTestConnector(id: $id) {
      ok
      message
      details
    }
  }
`;

export const INTEL_SYNC_CONNECTOR = gql`
  mutation IntelSyncConnector($id: ID!, $full: Boolean) {
    intelSyncConnector(id: $id, full: $full)
  }
`;

export const INTEL_DISCOVER_TOOLS = gql`
  mutation IntelDiscoverTools($id: ID!) {
    intelDiscoverTools(id: $id) {
      ...IntelConnectorFields
    }
  }
  ${CONNECTOR_FIELDS}
`;

export const INTEL_SET_TOOL_CLASS = gql`
  mutation IntelSetToolClass($id: ID!, $tool: String!, $class: String) {
    intelSetToolClass(id: $id, tool: $tool, class: $class) {
      ...IntelConnectorFields
    }
  }
  ${CONNECTOR_FIELDS}
`;

export const INTEL_PICKERS_MONGO = gql`
  query IntelMongoCollections($entry_id: ID!, $database: String) {
    intelMongoCollections(entry_id: $entry_id, database: $database)
  }
`;

export const INTEL_PICKERS_SLACK = gql`
  query IntelSlackChannels($entry_id: ID!) {
    intelSlackChannels(entry_id: $entry_id) {
      id
      name
      is_private
    }
  }
`;

export const INTEL_PICKERS_BRANCHES = gql`
  query IntelGithubBranches($entry_id: ID!, $owner: String!, $repo: String!) {
    intelGithubBranches(entry_id: $entry_id, owner: $owner, repo: $repo)
  }
`;

export const INTEL_SYNC_RUNS = gql`
  query IntelSyncRuns($connector_id: ID, $limit: Int) {
    intelSyncRuns(connector_id: $connector_id, limit: $limit) {
      id
      connector_id
      connector_name
      kind
      mode
      trigger
      status
      error
      log
      started_at
      finished_at
      created_at
      stats {
        seen
        indexed
        unchanged
        failed
        deleted
      }
    }
  }
`;

export const INTEL_REBUILD_INDEX = gql`
  mutation IntelRebuildIndex($scope: String) {
    intelRebuildIndex(scope: $scope)
  }
`;

export const INTEL_INDEX = gql`
  query IntelIndex($source: String, $scope: String, $status: String, $search: String, $page: Int, $page_size: Int) {
    intelIndexStats {
      source
      scope
      documents
      chunks
      failed
    }
    intelIndexDocuments(source: $source, scope: $scope, status: $status, search: $search, page: $page, page_size: $page_size) {
      total
      rows {
        id
        source
        connector_id
        scope
        title
        url
        version
        chunk_count
        status
        error
        indexed_at
      }
    }
  }
`;

export const INTEL_HEALTH = gql`
  query IntelHealth {
    intelHealth {
      qdrant_configured
      qdrant_reachable
      queue_configured
      openai_configured
      openai_entry_selected
      failed_runs_24h
      pending_approvals
      collections {
        scope
        name
        exists
        status
        points
        dimensions
        dimension_mismatch
      }
      connector_errors {
        id
        name
        kind
        error
      }
    }
  }
`;

export const INTEL_AUDIT = gql`
  query IntelAudit($type: String, $status: String, $search: String, $page: Int, $page_size: Int) {
    intelAudit(type: $type, status: $status, search: $search, page: $page, page_size: $page_size) {
      total
      rows {
        id
        type
        action
        status
        user_id
        level
        environment
        target
        detail
        created_at
        sealed
      }
    }
  }
`;

export const INTEL_USAGE = gql`
  query IntelUsage($days: Int) {
    intelUsage(days: $days) {
      days
      total_calls
      total_tokens
      total_cost_usd
      by_task {
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
      by_day {
        key
        calls
        tokens
        cost_usd
      }
    }
  }
`;

export interface SettingsData {
  intelSettings: IntelSettingsPayload;
}
export interface UpdateSettingsData {
  intelUpdateSettings: IntelSettingsPayload;
}
export interface EntryOptionsData {
  intelEntryOptions: IntelEntryOption[];
}
export interface ConnectorsData {
  intelConnectors: IntelConnector[];
}
export interface TestConnectorData {
  intelTestConnector: IntelTestResult;
}
export interface SlackChannelsData {
  intelSlackChannels: IntelSlackChannel[];
}
export interface SyncRunsData {
  intelSyncRuns: IntelSyncRun[];
}
export interface IndexData {
  intelIndexStats: IntelIndexStat[];
  intelIndexDocuments: IntelIndexPage;
}
export interface HealthData {
  intelHealth: IntelHealth;
}
export interface AuditData {
  intelAudit: IntelAuditPage;
}
export interface UsageData {
  intelUsage: IntelUsage;
}
