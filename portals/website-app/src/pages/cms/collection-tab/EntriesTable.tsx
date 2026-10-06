import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Box } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { CmsEntryRow } from '../queries/entries';
import PublishStatus from '../components/PublishStatus';
import RowActions, { type RowAction } from '../components/RowActions';

interface Props {
  tableId: string;
  fetchRows: TableFetch<CmsEntryRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions: ReactNode;
  actionsFor: (entry: CmsEntryRow) => RowAction[];
}

const getRowId = (entry: CmsEntryRow) => entry.id;

/** A collection's entries, newest first. */
export default function EntriesTable({ tableId, fetchRows, refetchRef, toolbarActions, actionsFor }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDate, formatDateTime } = useDateFormat();

  const columns = useMemo<DuncitColumn<CmsEntryRow>[]>(
    () => [
      {
        field: 'cover_image_url',
        headerName: '',
        type: 'actions',
        width: 72,
        cellRenderer: (entry) =>
          entry.cover_image_url ? (
            <Box component="img" src={entry.cover_image_url} alt="" sx={{ width: 48, height: 32, objectFit: 'cover', borderRadius: 0.5, display: 'block', mt: 0.75 }} />
          ) : null,
      },
      { field: 'title', headerName: t('websiteApp.cms.entries.colTitle'), type: 'text', flex: 1, minWidth: 200 },
      { field: 'category', headerName: t('websiteApp.cms.entries.colCategory'), type: 'text', width: 150 },
      {
        field: 'is_published',
        headerName: t('shell.common.status'),
        type: 'boolean',
        width: 130,
        cellRenderer: (entry) => <PublishStatus published={entry.is_published} changes={false} />,
      },
      {
        field: 'published_at',
        headerName: t('websiteApp.cms.entries.colPublishedAt'),
        type: 'date',
        width: 140,
        valueGetter: (entry) => (entry.published_at ? formatDate(entry.published_at) : ''),
      },
      { field: 'updated_at', headerName: t('shell.common.updated'), type: 'date', width: 170, hide: true, valueGetter: (e) => (e.updated_at ? formatDateTime(e.updated_at) : '') },
      { field: 'actions', headerName: t('shell.common.actions'), type: 'actions', width: 110, cellRenderer: (entry) => <RowActions label={entry.title} actions={actionsFor(entry)} /> },
    ],
    [actionsFor, formatDate, formatDateTime, t],
  );

  return (
    <DuncitTable<CmsEntryRow>
      tableId={tableId}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      toolbarActions={toolbarActions}
      emptyText={t('websiteApp.cms.entries.empty')}
      defaultSort={{ field: 'published_at', dir: 'desc' }}
      refetchRef={refetchRef}
    />
  );
}
