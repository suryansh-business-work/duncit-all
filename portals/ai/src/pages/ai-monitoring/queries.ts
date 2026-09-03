import { gql } from '@apollo/client';

/** One AI monitoring check, exactly as `aiMonitoringLogsTable` returns it. */
export interface MonitoringLogRow {
  id: string;
  url: string;
  file_name: string;
  folder: string;
  surface: string;
  user_id: string | null;
  entity: string | null;
  risk: 'PENDING' | 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  action: 'NONE' | 'ALLOWED' | 'FLAGGED' | 'BLOCKED';
  summary: string;
  model: string;
  duration_ms: number;
  error: string;
  checked_at: string | null;
  created_at: string;
}

export const AI_MONITORING_LOGS_TABLE = gql`
  query AiMonitoringLogsTable($query: TableQueryInput) {
    aiMonitoringLogsTable(query: $query) {
      total
      page
      page_size
      rows {
        id
        url
        file_name
        folder
        surface
        user_id
        entity
        risk
        status
        action
        summary
        model
        duration_ms
        error
        checked_at
        created_at
      }
    }
  }
`;

export interface AiMonitoringSettings {
  chip_enabled: boolean;
  chip_label: string | null;
  dialog_title: string | null;
  dialog_intro: string | null;
  dialog_points: string[];
  dialog_footnote: string | null;
  dismiss_label: string | null;
  image_prompt: string;
  image_prompt_id: string | null;
  image_prompt_key: string;
  image_scan_model: string;
}

export const AI_MONITORING_SETTINGS = gql`
  query AiMonitoringSettings {
    aiMonitoringSettings {
      chip_enabled
      chip_label
      dialog_title
      dialog_intro
      dialog_points
      dialog_footnote
      dismiss_label
      image_prompt
      image_prompt_id
      image_prompt_key
      image_scan_model
    }
  }
`;

export const UPDATE_AI_MONITORING_SETTINGS = gql`
  mutation UpdateAiMonitoringSettings($input: UpdateAiMonitoringSettingsInput!) {
    updateAiMonitoringSettings(input: $input) {
      chip_enabled
      chip_label
      dialog_title
      dialog_intro
      dialog_points
      dialog_footnote
      dismiss_label
      image_prompt
      image_prompt_id
      image_prompt_key
      image_scan_model
    }
  }
`;

type ChipColor = 'default' | 'success' | 'warning' | 'error' | 'info';

/**
 * PENDING is not a verdict — the check is still running — so it is never
 * coloured like one. HIGH and MEDIUM are the two an operator is here for.
 */
export const RESULT_COLOR: Record<MonitoringLogRow['risk'], ChipColor> = {
  PENDING: 'default',
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'error',
};

/**
 * SKIPPED means the platform never called OpenAI (no key configured). Colouring
 * it like a failure sends an operator hunting for a fault that is a setting.
 */
export const STATUS_COLOR: Record<MonitoringLogRow['status'], ChipColor> = {
  PENDING: 'default',
  COMPLETED: 'success',
  FAILED: 'error',
  SKIPPED: 'warning',
};

export const ACTION_COLOR: Record<MonitoringLogRow['action'], ChipColor> = {
  NONE: 'default',
  ALLOWED: 'success',
  FLAGGED: 'warning',
  BLOCKED: 'error',
};

/**
 * Filter options, labelled.
 *
 * A value with no label falls back to the value itself rather than rendering a
 * blank row — the mistake this catches is adding a status to the list below and
 * forgetting its wording. Exported so that safety net is actually proven.
 */
export const options = (values: readonly string[], labels: Record<string, string>) =>
  values.map((value) => ({ value, label: labels[value] ?? value }));

export const RESULT_OPTIONS = options(['PENDING', 'LOW', 'MEDIUM', 'HIGH'], {
  PENDING: 'Not yet judged',
  LOW: 'Low risk',
  MEDIUM: 'Medium risk',
  HIGH: 'High risk',
});

export const STATUS_OPTIONS = options(['PENDING', 'COMPLETED', 'FAILED', 'SKIPPED'], {
  PENDING: 'Running',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  SKIPPED: 'Not configured',
});

export const ACTION_OPTIONS = options(['NONE', 'ALLOWED', 'FLAGGED', 'BLOCKED'], {
  NONE: 'None yet',
  ALLOWED: 'Allowed',
  FLAGGED: 'Flagged for review',
  BLOCKED: 'Blocked',
});

export const SURFACE_OPTIONS = options(['PORTALS', 'MOBILE', 'MWEB'], {
  PORTALS: 'Portals',
  MOBILE: 'Mobile app',
  MWEB: 'mWeb',
});
