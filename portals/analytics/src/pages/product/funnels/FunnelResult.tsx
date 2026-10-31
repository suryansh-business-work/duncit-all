import { useMemo } from 'react';
import { Alert, Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { DuncitTable, clientTableFetch, type DuncitColumn } from '@duncit/table';
import { DistributionCard } from '@duncit/ui';
import { asCount, asDuration, asPercent, type Translate } from '../labels';
import { KIND_LABELS, OUTCOME_LABELS } from './funnel-form';
import type { ProductFunnelStepKind, ProductOutcome } from '../queries';

interface StepRow {
  id: string;
  name: string;
  entered: number;
  conversion_from_previous?: number | null;
  conversion_from_start?: number | null;
  dropped: number;
  median_ms_from_previous?: number | null;
}

interface FunnelData {
  window_days: number;
  truncated: boolean;
  steps: ReadonlyArray<Omit<StepRow, 'id' | 'name'> & { kind: ProductFunnelStepKind; value: string }>;
}

/** A step's name: the outcome's words, or the kind and the event, screen or element it matches. */
function stepName(step: FunnelData['steps'][number], index: number, t: Translate): string {
  const what = step.kind === 'OUTCOME' ? t(OUTCOME_LABELS[step.value as ProductOutcome] ?? step.value) : step.value;
  return `${index + 1}. ${t(KIND_LABELS[step.kind])}: ${what}`;
}

const columns = (t: Translate): Array<DuncitColumn<StepRow>> => [
  { field: 'name', headerName: t('analytics.product.funnels.step'), type: 'text', flex: 2, minWidth: 220, sortable: false, filterable: false },
  { field: 'entered', headerName: t('analytics.product.funnels.entered'), type: 'number', width: 120, sortable: false, filterable: false, cellRenderer: (row) => asCount(row.entered) },
  { field: 'conversion_from_previous', headerName: t('analytics.product.funnels.fromPrevious'), type: 'number', width: 150, sortable: false, filterable: false, cellRenderer: (row) => asPercent(row.conversion_from_previous) },
  { field: 'conversion_from_start', headerName: t('analytics.product.funnels.fromStart'), type: 'number', width: 140, sortable: false, filterable: false, cellRenderer: (row) => asPercent(row.conversion_from_start) },
  { field: 'dropped', headerName: t('analytics.product.funnels.dropped'), type: 'number', width: 120, sortable: false, filterable: false, cellRenderer: (row) => asCount(row.dropped) },
  { field: 'median_ms_from_previous', headerName: t('analytics.product.funnels.medianTime'), type: 'number', width: 150, sortable: false, filterable: false, cellRenderer: (row) => asDuration(row.median_ms_from_previous) },
];

/** How many people reached each step in order, where they dropped, and how long each step took. */
export default function FunnelResult({ funnel }: Readonly<{ funnel: FunnelData }>) {
  const { t } = useTranslation();
  const rows = useMemo<StepRow[]>(
    () => funnel.steps.map((step, index) => ({ ...step, id: String(index), name: stepName(step, index, t) })),
    [funnel, t]
  );
  const cols = useMemo(() => columns(t), [t]);
  const fetchRows = useMemo(() => clientTableFetch(rows, (row) => row.name, cols), [rows, cols]);
  return (
    <Stack spacing={2} data-testid="funnel-result">
      {funnel.truncated && <Alert severity="warning">{t('analytics.product.funnels.truncated')}</Alert>}
      <DistributionCard
        title={t('analytics.product.funnels.chart', { vars: { days: funnel.window_days } })}
        buckets={rows.map((row) => ({ key: row.name, count: row.entered }))}
        emptyText={t('analytics.product.empty')}
      />
      <DuncitTable
        tableId="analytics-product-funnel"
        columns={cols}
        fetchRows={fetchRows}
        getRowId={(row) => row.id}
        defaultPageSize={10}
        ariaLabel={t('analytics.product.funnels.title')}
      />
    </Stack>
  );
}
