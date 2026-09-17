import { useMemo } from 'react';
import { LinearProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { DuncitColumn } from '@duncit/table';
import LiveRowsTable from '../../components/LiveRowsTable';
import { SectionCard } from '@duncit/ui';
import type { StressContainerSample } from '../../queries';
import { formatPct } from '../../labels';

const getRowId = (row: StressContainerSample) => row.name;
const searchOf = (row: StressContainerSample) => row.name;

/** Docker reports a container's CPU against ONE core, so a busy one reads past 100%. */
const renderCpu = (row: StressContainerSample) => (
  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', height: '100%' }}>
    <LinearProgress
      variant="determinate"
      value={Math.min(100, row.cpu_pct)}
      color={row.cpu_pct >= 80 ? 'error' : 'primary'}
      sx={{ flex: 1, height: 6, borderRadius: 3 }}
    />
    <Typography variant="body2" sx={{ minWidth: 52, textAlign: 'right' }}>
      {formatPct(row.cpu_pct)}
    </Typography>
  </Stack>
);

interface Props {
  containers: readonly StressContainerSample[];
}

/**
 * The busiest containers at the newest sample — production's and staging's
 * alike, because they share the box and the neighbour that is starving is the
 * one a filtered list would hide.
 */
export default function ContainersTable({ containers }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<StressContainerSample>[]>(
    () => [
      { field: 'name', headerName: t('tech.stress.colContainer'), flex: 1, minWidth: 220, type: 'text', valueGetter: (row) => row.name },
      { field: 'cpu_pct', headerName: t('tech.stress.colCpu'), width: 200, type: 'number', cellRenderer: renderCpu, valueGetter: (row) => row.cpu_pct },
      { field: 'memory_mb', headerName: t('tech.stress.colMemory'), width: 130, type: 'number', valueGetter: (row) => `${row.memory_mb} MB` },
      { field: 'memory_pct', headerName: t('tech.stress.colMemoryPct'), width: 130, type: 'number', valueGetter: (row) => formatPct(row.memory_pct) },
    ],
    [t]
  );

  return (
    <SectionCard title={t('tech.stress.containersTitle')} subtitle={t('tech.stress.containersSubtitle')}>
      <LiveRowsTable
        tableId="tech-stress-containers"
        columns={columns}
        rows={containers}
        getRowId={getRowId}
        searchOf={searchOf}
        emptyText={t('tech.stress.containersEmpty')}
        searchPlaceholder={t('tech.stress.containersSearch')}
      />
    </SectionCard>
  );
}
