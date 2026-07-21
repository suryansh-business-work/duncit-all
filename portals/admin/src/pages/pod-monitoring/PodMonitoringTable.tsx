import { useMemo, type MutableRefObject } from 'react';
import { Chip, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import {
  ACTION_COLORS,
  ACTION_LABELS,
  ACTION_OPTIONS,
  fmtWhen,
  RISK_COLORS,
  RISK_OPTIONS,
  SOURCE_LABELS,
  SOURCE_OPTIONS,
  type PodAuditLog,
} from './queries';

const getRowId = (row: PodAuditLog) => row.id;

const renderAction = (row: PodAuditLog) => (
  <Chip size="small" label={ACTION_LABELS[row.action]} color={ACTION_COLORS[row.action]} />
);

const renderRisk = (row: PodAuditLog) => (
  <Chip size="small" label={row.ai_risk} color={RISK_COLORS[row.ai_risk]} variant="outlined" />
);

const renderSummary = (row: PodAuditLog) => (
  <Typography variant="body2" color="text.secondary" component="span">
    {row.ai_summary || '—'}
  </Typography>
);

interface Props {
  fetchRows: TableFetch<PodAuditLog>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onRowClick: (row: PodAuditLog) => void;
}

/** AI-monitored pod activity table — shared column set for the Admin and
 * Partners (Club Admin) monitoring pages. */
export default function PodMonitoringTable({ fetchRows, refetchRef, onRowClick }: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<PodAuditLog>[]>(
    () => [
      {
        field: 'created_at',
        headerName: 'When',
        width: 170,
        filter: { type: 'date' },
        valueGetter: (row) => fmtWhen(row.created_at),
      },
      {
        field: 'pod_title',
        headerName: 'Pod',
        flex: 1,
        minWidth: 170,
        valueGetter: (row) => row.pod_title || row.pod_id,
      },
      {
        field: 'action',
        headerName: 'Action',
        width: 150,
        filter: { type: 'select', options: ACTION_OPTIONS },
        cellRenderer: renderAction,
        valueGetter: (row) => ACTION_LABELS[row.action],
      },
      {
        field: 'source',
        headerName: 'By',
        width: 150,
        filter: { type: 'select', options: SOURCE_OPTIONS },
        valueGetter: (row) =>
          row.actor_name ? `${row.actor_name} · ${SOURCE_LABELS[row.source]}` : SOURCE_LABELS[row.source],
      },
      {
        field: 'changes',
        headerName: 'Changes',
        sortable: false,
        width: 100,
        valueGetter: (row) => String(row.changes.length),
      },
      {
        field: 'ai_risk',
        headerName: 'AI Risk',
        width: 120,
        filter: { type: 'select', options: RISK_OPTIONS },
        cellRenderer: renderRisk,
        valueGetter: (row) => row.ai_risk,
      },
      {
        field: 'ai_summary',
        headerName: 'AI Summary',
        sortable: false,
        flex: 1.4,
        minWidth: 220,
        cellRenderer: renderSummary,
        valueGetter: (row) => row.ai_summary,
      },
    ],
    [],
  );

  return (
    <DuncitTable<PodAuditLog>
      tableId="pod-monitoring"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onRowClick}
      emptyText="No pod activity recorded yet."
      searchPlaceholder="Search pod, actor or AI summary"
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      refetchRef={refetchRef}
    />
  );
}
