import { useMemo, type MutableRefObject } from 'react';
import { Chip, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import {
  POD_AUDIT_ACTION_COLORS,
  POD_AUDIT_RISK_COLORS,
  podAuditActionLabel,
  podAuditActionOptions,
  podAuditRiskLabel,
  podAuditRiskOptions,
  podAuditSourceLabel,
  podAuditSourceOptions,
  type PodAuditLog,
} from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { fmtWhen } from './queries';

const getRowId = (row: PodAuditLog) => row.id;

const renderSummary = (row: PodAuditLog) => (
  <Typography variant="body2" component="span" sx={{
    color: "text.secondary"
  }}>
    {row.ai_summary || '—'}
  </Typography>
);

interface Props {
  fetchRows: TableFetch<PodAuditLog>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onRowClick: (row: PodAuditLog) => void;
}

/** AI-monitored pod activity table for the clubs this admin runs. */
export default function ClubAdminPodMonitoringTable({ fetchRows, refetchRef, onRowClick }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<PodAuditLog>[]>(() => {
    const renderAction = (row: PodAuditLog) => (
      <Chip
        size="small"
        label={podAuditActionLabel(row.action, t)}
        color={POD_AUDIT_ACTION_COLORS[row.action]}
      />
    );
    const renderRisk = (row: PodAuditLog) => (
      <Chip
        size="small"
        label={podAuditRiskLabel(row.ai_risk, t)}
        color={POD_AUDIT_RISK_COLORS[row.ai_risk]}
        variant="outlined"
      />
    );
    const actorValue = (row: PodAuditLog) => {
      const source = podAuditSourceLabel(row.source, t);
      return row.actor_name ? `${row.actor_name} · ${source}` : source;
    };
    return [
      {
        field: 'created_at',
        headerName: t('clubAdmin.monitoring.when'),
        width: 170,
        filter: { type: 'date' },
        valueGetter: (row) => fmtWhen(row.created_at),
      },
      {
        field: 'pod_title',
        headerName: t('partners.common.pod'),
        flex: 1,
        minWidth: 170,
        valueGetter: (row) => row.pod_title || row.pod_id,
      },
      {
        field: 'action',
        headerName: t('partners.common.action'),
        width: 150,
        filter: { type: 'select', options: podAuditActionOptions(t) },
        cellRenderer: renderAction,
        valueGetter: (row) => podAuditActionLabel(row.action, t),
      },
      {
        field: 'source',
        headerName: t('clubAdmin.monitoring.actor'),
        width: 150,
        filter: { type: 'select', options: podAuditSourceOptions(t) },
        valueGetter: actorValue,
      },
      {
        field: 'changes',
        headerName: t('clubAdmin.monitoring.changes'),
        sortable: false,
        width: 100,
        valueGetter: (row) => String(row.changes.length),
      },
      {
        field: 'ai_risk',
        headerName: t('clubAdmin.monitoring.aiRisk'),
        width: 120,
        filter: { type: 'select', options: podAuditRiskOptions(t) },
        cellRenderer: renderRisk,
        valueGetter: (row) => podAuditRiskLabel(row.ai_risk, t),
      },
      {
        field: 'ai_summary',
        headerName: t('clubAdmin.monitoring.aiSummary'),
        sortable: false,
        flex: 1.4,
        minWidth: 220,
        cellRenderer: renderSummary,
        valueGetter: (row) => row.ai_summary,
      },
    ];
  }, [t]);

  return (
    <DuncitTable<PodAuditLog>
      tableId="club-admin-pod-monitoring"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onRowClick}
      emptyText={t('clubAdmin.monitoring.noActivity')}
      searchPlaceholder={t('clubAdmin.monitoring.search')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      refetchRef={refetchRef}
    />
  );
}
