import { useCallback } from 'react';
import { Grid } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { CALL_STATUS, vocabularyLabel } from '../../lib/labels';
import BucketTable from './BucketTable';
import type { UsageBucket, UsageDashboard } from './queries';

interface Breakdown {
  id: string;
  titleKey: string;
  headerKey: string;
  rows: readonly UsageBucket[];
  labelOf?: (key: string) => string;
}

/**
 * The window split six ways — by tool, category, AI app, connector, status
 * and (for managers, whose summary covers everyone) by person.
 */
export default function Breakdowns({ summary, currency }: Readonly<{ summary: UsageDashboard; currency: string }>) {
  const { t } = useTranslation();
  const statusLabel = useCallback((key: string) => vocabularyLabel(CALL_STATUS, key, t), [t]);
  const breakdowns: Breakdown[] = [
    { id: 'tool', titleKey: 'mcp.dashboard.byTool', headerKey: 'mcp.dashboard.columnTool', rows: summary.by_tool },
    { id: 'category', titleKey: 'mcp.dashboard.byCategory', headerKey: 'mcp.dashboard.columnCategory', rows: summary.by_category },
    { id: 'client', titleKey: 'mcp.dashboard.byClient', headerKey: 'mcp.dashboard.columnClient', rows: summary.by_client },
    { id: 'endpoint', titleKey: 'mcp.dashboard.byEndpoint', headerKey: 'mcp.dashboard.columnEndpoint', rows: summary.by_endpoint },
    {
      id: 'status',
      titleKey: 'mcp.dashboard.byStatus',
      headerKey: 'mcp.dashboard.columnStatus',
      rows: summary.by_status,
      labelOf: statusLabel,
    },
  ];
  if (summary.scope === 'ALL') {
    breakdowns.push({ id: 'user', titleKey: 'mcp.dashboard.byUser', headerKey: 'mcp.dashboard.columnPerson', rows: summary.by_user });
  }

  return (
    <Grid container spacing={2}>
      {breakdowns.map((breakdown) => (
        <Grid key={breakdown.id} size={{ xs: 12, lg: 6 }}>
          <BucketTable
            tableId={`mcp-usage-by-${breakdown.id}`}
            title={t(breakdown.titleKey)}
            keyHeader={t(breakdown.headerKey)}
            rows={breakdown.rows}
            currency={currency}
            labelOf={breakdown.labelOf}
          />
        </Grid>
      ))}
    </Grid>
  );
}
