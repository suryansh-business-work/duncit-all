import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Tooltip, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { MEDIA_ORGANIZER_FILES_TABLE, type RelocationRow, type RelocationStatus } from './queries';

const STATUS_COLORS: StatusColorMap = {
  PENDING: 'info',
  DONE: 'success',
  IN_PLACE: 'default',
  SHARED: 'warning',
  FAILED: 'error',
  ROLLED_BACK: 'default',
};

const getRowId = (row: RelocationRow) => row.id;

/** A path cell: long, so it truncates and shows the whole path on hover. */
function PathCell({ path }: Readonly<{ path: string }>) {
  if (!path) return null;
  return (
    <Tooltip title={path}>
      <Typography variant="body2" noWrap sx={{ fontFamily: 'monospace' }}>
        {path}
      </Typography>
    </Tooltip>
  );
}

/** Every file one run found, filterable by what happened to it. */
export default function RunFilesTable({ runId }: Readonly<{ runId: string }>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<RelocationRow>(
    client,
    MEDIA_ORGANIZER_FILES_TABLE,
    'mediaOrganizerFilesTable',
    { extraVariables: { run_id: runId } },
    [runId],
  );

  const columns = useMemo<DuncitColumn<RelocationRow>[]>(() => {
    const labels: Record<RelocationStatus, string> = {
      PENDING: t('tech.mediaOrganizer.statusPending'),
      DONE: t('tech.mediaOrganizer.statusDone'),
      IN_PLACE: t('tech.mediaOrganizer.statusInPlace'),
      SHARED: t('tech.mediaOrganizer.statusShared'),
      FAILED: t('tech.mediaOrganizer.statusFailed'),
      ROLLED_BACK: t('tech.mediaOrganizer.statusRolledBack'),
    };
    return [
      {
        field: 'status',
        headerName: t('tech.mediaOrganizer.colStatus'),
        width: 140,
        type: 'enum',
        options: Object.entries(labels).map(([value, label]) => ({ value, label })),
        valueGetter: (row) => labels[row.status],
        cellRenderer: (row) => <StatusChip status={row.status} label={labels[row.status]} colorMap={STATUS_COLORS} />,
      },
      {
        field: 'file_path',
        headerName: t('tech.mediaOrganizer.colFile'),
        flex: 1,
        minWidth: 260,
        type: 'text',
        valueGetter: (row) => row.file_path,
        cellRenderer: (row) => <PathCell path={row.file_path} />,
      },
      {
        field: 'new_file_path',
        headerName: t('tech.mediaOrganizer.colNewFile'),
        flex: 1,
        minWidth: 260,
        type: 'text',
        sortable: false,
        filterable: false,
        valueGetter: (row) => row.new_file_path,
        cellRenderer: (row) => <PathCell path={row.new_file_path} />,
      },
      {
        field: 'owners',
        headerName: t('tech.mediaOrganizer.colOwners'),
        minWidth: 220,
        type: 'text',
        sortable: false,
        filterable: false,
        valueGetter: (row) => row.owners.join(', '),
      },
      {
        field: 'references',
        headerName: t('tech.mediaOrganizer.colRefs'),
        width: 140,
        type: 'text',
        sortable: false,
        filterable: false,
        valueGetter: (row) =>
          t('tech.mediaOrganizer.refsValue', { vars: { rewritten: row.rewritten, references: row.references } }),
      },
      {
        field: 'error',
        headerName: t('tech.mediaOrganizer.colError'),
        minWidth: 220,
        type: 'text',
        sortable: false,
        filterable: false,
        valueGetter: (row) => row.error,
      },
    ];
  }, [t]);

  return (
    <DuncitTable<RelocationRow>
      ariaLabel={t('tech.mediaOrganizer.filesTitle')}
      tableId="tech-media-organizer-files"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('tech.mediaOrganizer.filesEmpty')}
      searchPlaceholder={t('tech.mediaOrganizer.filesSearch')}
    />
  );
}
