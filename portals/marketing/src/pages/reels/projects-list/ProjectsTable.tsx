import { useMemo } from 'react';
import { DuncitTable, actionsColumn, clientTableFetch, dateColumn, type DuncitColumn } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import { formatReelDuration } from '../format';
import type { ReelProjectSummary } from '../types';

interface Props {
  rows: readonly ReelProjectSummary[];
  onOpen: (project: ReelProjectSummary) => void;
  onDelete: (project: ReelProjectSummary) => void;
}

const getRowId = (row: ReelProjectSummary) => row.id;

/** A reel's length, written the way the studio writes it everywhere else. */
const lengthCell = (row: ReelProjectSummary) => <span>{formatReelDuration(row.duration_ms)}</span>;

export default function ProjectsTable({ rows, onOpen, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();

  const columns = useMemo<DuncitColumn<ReelProjectSummary>[]>(
    () => [
      { field: 'name', headerName: t('ai.reels.list.colName'), flex: 1, minWidth: 220, type: 'text', valueGetter: (row) => row.name },
      { field: 'asset_count', headerName: t('ai.reels.list.colFootage'), width: 120, type: 'number', valueGetter: (row) => row.asset_count },
      { field: 'scene_count', headerName: t('ai.reels.list.colScenes'), width: 110, type: 'number', valueGetter: (row) => row.scene_count },
      {
        field: 'duration_ms',
        headerName: t('ai.reels.list.colLength'),
        width: 110,
        type: 'number',
        valueGetter: (row) => row.duration_ms,
        cellRenderer: lengthCell,
      },
      { field: 'created_by', headerName: t('ai.reels.list.colCreatedBy'), width: 220, type: 'text', valueGetter: (row) => row.created_by },
      dateColumn<ReelProjectSummary>({ field: 'updated_at', headerName: t('ai.reels.list.colUpdated'), width: 165, hide: false }),
      actionsColumn<ReelProjectSummary>({
        width: 110,
        onEdit: onOpen,
        onDelete,
        edit: { title: t('ai.reels.list.open'), ariaLabel: (row) => t('ai.reels.list.actionsFor', { vars: { name: row.name } }) },
      }),
    ],
    [t, onOpen, onDelete]
  );

  const fetchRows = useMemo(
    () => clientTableFetch(rows, (row) => `${row.name} ${row.created_by} ${row.drive_url}`, columns),
    [rows, columns]
  );

  return (
    <DuncitTable
      tableId="reel-projects"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onOpen}
      emptyText={t('ai.reels.list.empty')}
      searchPlaceholder={t('ai.reels.list.search')}
      defaultSort={{ field: 'updated_at', dir: 'desc' }}
      ariaLabel={t('ai.reels.list.title')}
    />
  );
}
