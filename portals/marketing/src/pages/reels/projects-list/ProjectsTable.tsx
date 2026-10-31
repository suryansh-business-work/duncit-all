import { useMemo } from 'react';
import { Chip } from '@mui/material';
import { DuncitTable, actionsColumn, clientTableFetch, dateColumn, type DuncitColumn } from '@duncit/table';
import { useTranslation, type Translate } from '@duncit/shell';
import { formatReelDuration } from '../format';
import MediaThumb from '../studio/MediaThumb';
import type { ReelProjectSummary } from '../types';

interface Props {
  rows: readonly ReelProjectSummary[];
  onOpen: (project: ReelProjectSummary) => void;
  onDelete: (project: ReelProjectSummary) => void;
}

const getRowId = (row: ReelProjectSummary) => row.id;

/** What the check column shows before any check has run. */
const NONE = '—';

/** A reel's length, written the way the studio writes it everywhere else. */
const lengthCell = (row: ReelProjectSummary) => <span>{formatReelDuration(row.duration_ms)}</span>;

/** The cover frame, when one has been picked; a film icon until then. */
const coverCell = (row: ReelProjectSummary) => <MediaThumb kind="VIDEO" src={row.cover_url} size={36} />;

/** How the last pre-export check went — pass or fail in words, nothing until one has run. */
const checkCell = (row: ReelProjectSummary, t: Translate) => {
  if (row.last_check_pass === null) return <span data-testid={`reel-check-none-${row.id}`}>{NONE}</span>;
  return <Chip size="small" variant="outlined" color={row.last_check_pass ? 'success' : 'warning'} label={row.last_check_pass ? t('ai.reels.list.checkPass') : t('ai.reels.list.checkFail')} />;
};

const countCell = (value: number) => <span>{value.toLocaleString()}</span>;

export default function ProjectsTable({ rows, onOpen, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();

  const columns = useMemo<DuncitColumn<ReelProjectSummary>[]>(
    () => [
      { field: 'cover', headerName: t('ai.reels.list.colCover'), width: 72, type: 'text', sortable: false, valueGetter: (row) => row.cover_url, cellRenderer: coverCell },
      { field: 'name', headerName: t('ai.reels.list.colName'), flex: 1, minWidth: 220, type: 'text', valueGetter: (row) => row.name },
      {
        field: 'duration_ms',
        headerName: t('ai.reels.list.colLength'),
        width: 110,
        type: 'number',
        valueGetter: (row) => row.duration_ms,
        cellRenderer: lengthCell,
      },
      {
        field: 'last_check_pass',
        headerName: t('ai.reels.list.colChecks'),
        width: 130,
        type: 'text',
        valueGetter: (row) => String(row.last_check_pass ?? ''),
        cellRenderer: (row) => checkCell(row, t),
      },
      { field: 'posts_count', headerName: t('ai.reels.list.colPosts'), width: 100, type: 'number', valueGetter: (row) => row.posts_count, cellRenderer: (row) => countCell(row.posts_count) },
      { field: 'views', headerName: t('ai.reels.list.colViews'), width: 110, type: 'number', valueGetter: (row) => row.views, cellRenderer: (row) => countCell(row.views) },
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
