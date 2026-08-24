import { useMemo, type MutableRefObject } from 'react';
import { useTranslation } from '@duncit/shell';
import { DuncitTable, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import {
  makeRenderActions,
  makeRenderFile,
  makeRenderStatus,
  makeRenderTrigger,
  makeStatusOptions,
  makeTriggerOptions,
  renderSize,
  type RowActions,
} from './cells';
import { getRowId, type BackupRow } from './queries';

interface Props extends RowActions {
  fetchRows: TableFetch<BackupRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
}

export default function BackupsTable({
  fetchRows,
  refetchRef,
  onDownload,
  onRestore,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();

  const columns = useMemo<DuncitColumn<BackupRow>[]>(() => {
    const statusLabels = {
      RUNNING: t('tech.dbBackup.statusRunning'),
      CHECKING: t('tech.dbBackup.statusChecking'),
      SUCCEEDED: t('tech.dbBackup.statusSucceeded'),
      FAILED: t('tech.dbBackup.statusFailed'),
    };
    const triggerLabels = {
      SCHEDULED: t('tech.dbBackup.triggerScheduled'),
      MANUAL: t('tech.dbBackup.triggerManual'),
      UPLOADED: t('tech.dbBackup.triggerUploaded'),
    };
    const actionLabels = {
      download: t('tech.dbBackup.download'),
      restore: t('tech.dbBackup.restore'),
      delete: t('tech.dbBackup.deleteAction'),
      noFile: t('tech.dbBackup.noFile'),
    };
    return [
      dateColumn<BackupRow>({
        field: 'started_at',
        headerName: t('tech.dbBackup.colWhen'),
        width: 165,
        // dateColumn defaults to hidden (it was built for audit tables); here it
        // IS the primary timestamp and the default sort.
        hide: false,
        // `field` is the SERVER's name — it is what sort and filter are sent as,
        // and the service's sortFields allowlist is snake_case. The row arriving
        // back is camelCase, so the value has to be read explicitly; the default
        // reader would look for row.started_at and render an em-dash forever.
        //
        // It stays the row's OWN start, not the archive's: sorting is sent to
        // the server as started_at, and a cell showing a different date than the
        // one it is ordered by reads as a broken table. An uploaded archive
        // carries its real age beside its name instead.
        getDate: (row) => row.startedAt,
      }),
      {
        field: 'status',
        headerName: t('tech.dbBackup.colStatus'),
        width: 130,
        filter: { type: 'select', options: makeStatusOptions(statusLabels) },
        cellRenderer: makeRenderStatus(statusLabels),
        valueGetter: (row) => row.status,
      },
      {
        field: 'trigger',
        headerName: t('tech.dbBackup.colTrigger'),
        width: 120,
        filter: { type: 'select', options: makeTriggerOptions(triggerLabels) },
        cellRenderer: makeRenderTrigger(triggerLabels),
        valueGetter: (row) => row.trigger,
      },
      {
        field: 'size_bytes',
        headerName: t('tech.dbBackup.colSize'),
        width: 150,
        cellRenderer: renderSize,
        valueGetter: (row) => String(row.sizeBytes),
      },
      {
        field: 'documents_total',
        headerName: t('tech.dbBackup.colDocuments'),
        width: 130,
        valueGetter: (row) => row.documentsTotal.toLocaleString(),
      },
      {
        field: 'collectionsTotal',
        headerName: t('tech.dbBackup.colCollections'),
        width: 120,
        sortable: false,
        valueGetter: (row) => String(row.collectionsTotal),
      },
      {
        field: 'file_name',
        headerName: t('tech.dbBackup.colFile'),
        flex: 1,
        minWidth: 240,
        cellRenderer: makeRenderFile({
          noFile: t('tech.dbBackup.noFile'),
          taken: (when) => t('tech.dbBackup.restoreTaken', { vars: { when } }),
        }),
        valueGetter: (row) => row.fileName ?? t('tech.dbBackup.noFile'),
      },
      {
        field: 'started_by',
        headerName: t('tech.dbBackup.colStartedBy'),
        minWidth: 180,
        valueGetter: (row) => row.startedBy ?? t('tech.dbBackup.byScheduler'),
      },
      dateColumn<BackupRow>({
        field: 'finished_at',
        headerName: t('tech.dbBackup.colFinished'),
        width: 165,
        getDate: (row) => row.finishedAt,
      }),
      {
        field: 'actions',
        headerName: t('tech.dbBackup.colActions'),
        width: 140,
        sortable: false,
        cellRenderer: makeRenderActions(actionLabels, { onDownload, onRestore, onDelete }),
        valueGetter: (row) => (row.hasFile ? 'available' : 'gone'),
      },
    ];
  }, [t, onDownload, onRestore, onDelete]);

  return (
    <DuncitTable<BackupRow>
      tableId="tech-db-backups"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('tech.dbBackup.empty')}
      defaultSort={{ field: 'started_at', dir: 'desc' }}
      searchPlaceholder={t('tech.dbBackup.searchPlaceholder')}
      refetchRef={refetchRef}
    />
  );
}
