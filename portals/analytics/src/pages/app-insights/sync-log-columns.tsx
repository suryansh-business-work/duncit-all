import { Chip } from '@mui/material';
import type { DuncitColumn } from '@duncit/table';
import type { AppInsightSyncLog } from './queries';
import { STORE_LABEL } from './tabs';

type Translate = (key: string) => string;

const OUTCOME: Record<AppInsightSyncLog['outcome'], { label: string; color: 'info' | 'success' | 'error' }> = {
  RUNNING: { label: 'analytics.appInsights.log.running', color: 'info' },
  SUCCESS: { label: 'analytics.appInsights.log.success', color: 'success' },
  FAILED: { label: 'analytics.appInsights.log.failed', color: 'error' },
};

const TRIGGER: Record<AppInsightSyncLog['trigger'], string> = {
  SCHEDULE: 'analytics.appInsights.log.schedule',
  MANUAL: 'analytics.appInsights.log.manual',
};

/** The sync log's columns: when, which store, why it ran, how it went and what it cost. */
export function syncLogColumns(
  t: Translate,
  formatDateTime: (value: string) => string,
  formatDuration: (ms: number) => string
): Array<DuncitColumn<AppInsightSyncLog>> {
  return [
    {
      field: 'started_at',
      headerName: t('analytics.appInsights.log.started'),
      type: 'date',
      width: 190,
      valueGetter: (row) => formatDateTime(row.started_at),
    },
    {
      field: 'store',
      headerName: t('analytics.appInsights.log.store'),
      type: 'text',
      width: 150,
      valueGetter: (row) => t(STORE_LABEL[row.store]),
    },
    {
      field: 'trigger',
      headerName: t('analytics.appInsights.log.trigger'),
      type: 'text',
      width: 120,
      valueGetter: (row) => t(TRIGGER[row.trigger]),
    },
    {
      field: 'outcome',
      headerName: t('analytics.appInsights.log.outcome'),
      type: 'text',
      width: 120,
      valueGetter: (row) => t(OUTCOME[row.outcome].label),
      cellRenderer: (row) => <Chip size="small" color={OUTCOME[row.outcome].color} label={t(OUTCOME[row.outcome].label)} />,
    },
    {
      field: 'duration_ms',
      headerName: t('analytics.appInsights.log.duration'),
      type: 'number',
      width: 120,
      valueGetter: (row) => (row.duration_ms === null || row.duration_ms === undefined ? '' : formatDuration(row.duration_ms)),
    },
    { field: 'sources_read', headerName: t('analytics.appInsights.log.read'), type: 'number', width: 110 },
    { field: 'sources_skipped', headerName: t('analytics.appInsights.log.skipped'), type: 'number', width: 120 },
    { field: 'rows_written', headerName: t('analytics.appInsights.log.rows'), type: 'number', width: 120 },
    { field: 'api_calls', headerName: t('analytics.appInsights.log.calls'), type: 'number', width: 110 },
    { field: 'retries', headerName: t('analytics.appInsights.log.retries'), type: 'number', width: 100 },
    { field: 'message', headerName: t('analytics.appInsights.log.message'), type: 'text', flex: 1, minWidth: 280 },
  ];
}
