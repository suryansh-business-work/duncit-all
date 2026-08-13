import { gql } from '@apollo/client';

export interface OpenAiLogRow {
  id: string;
  task: string;
  task_label: string;
  module: string;
  detail: string;
  model: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  http_status: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  priced: boolean;
  duration_ms: number;
  error_message: string;
  created_at: string;
}

export const OPENAI_LOGS_TABLE = gql`
  query OpenAiUsageLogsTable($query: TableQueryInput) {
    openAiUsageLogsTable(query: $query) {
      total
      rows {
        id
        task
        task_label
        module
        detail
        model
        status
        http_status
        prompt_tokens
        completion_tokens
        total_tokens
        cost_usd
        priced
        duration_ms
        error_message
        created_at
      }
    }
  }
`;

/**
 * One row with its prompt and answer.
 *
 * A separate query from the table on purpose: the two previews run to two
 * thousand characters each, and a page of twenty-five rows would carry a
 * hundred kilobytes of them before anyone clicked a thing.
 */
export interface OpenAiLogDetail extends OpenAiLogRow {
  request_preview: string;
  response_preview: string;
  user_id: string | null;
}

export const OPENAI_LOG_ONE = gql`
  query OpenAiUsageLog($id: ID!) {
    openAiUsageLog(id: $id) {
      id
      task
      task_label
      module
      detail
      model
      status
      http_status
      prompt_tokens
      completion_tokens
      total_tokens
      cost_usd
      priced
      duration_ms
      error_message
      created_at
      request_preview
      response_preview
      user_id
    }
  }
`;

/** Task and area options come from the server catalogue — never a client-side copy. */
export const OPENAI_TASK_CATALOGUE = gql`
  query OpenAiTaskCatalogue {
    openAiTaskCatalogue {
      tasks {
        key
        label
        module
      }
      modules
    }
  }
`;

export interface TaskCatalogue {
  tasks: Array<{ key: string; label: string; module: string }>;
  modules: string[];
}

/**
 * SKIPPED is not a failure — it is the platform declining to call OpenAI at all
 * because no key is configured. Colouring it like an error would send someone
 * hunting for a fault that is a setting.
 */
export const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  SUCCESS: 'success',
  SKIPPED: 'warning',
  FAILED: 'error',
};

export const STATUS_OPTIONS = [
  { value: 'SUCCESS', label: 'Success' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'SKIPPED', label: 'Not configured' },
];
