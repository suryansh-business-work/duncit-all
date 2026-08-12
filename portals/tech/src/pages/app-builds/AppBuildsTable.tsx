import { useMemo, type MutableRefObject } from 'react';
import { useTranslation } from '@duncit/shell';
import { DuncitTable, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import {
  getRowId,
  makeRenderLinks,
  makeRenderSlack,
  makeRenderStatus,
  makeStatusOptions,
  renderBuild,
  renderCommit,
} from './cells';
import {
  changesLabel,
  durationLabel,
  sizeLabel,
  type AppBuildPlatform,
  type AppBuildRow,
} from './queries';

interface Props {
  platform: AppBuildPlatform;
  fetchRows: TableFetch<AppBuildRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onRowClick: (row: AppBuildRow) => void;
  onDelete: (row: AppBuildRow) => void;
}

export default function AppBuildsTable({
  platform,
  fetchRows,
  refetchRef,
  onRowClick,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const tableId = platform === 'ANDROID' ? 'tech-app-builds-android' : 'tech-app-builds-ios';
  const columns = useMemo<DuncitColumn<AppBuildRow>[]>(() => {
    const statusLabels = {
      RUNNING: t('tech.appBuilds.statusRunning'),
      SUCCESS: t('tech.appBuilds.statusSuccess'),
      FAILED: t('tech.appBuilds.statusFailed'),
      stale: t('tech.appBuilds.statusStale'),
      elapsed: (minutes: string) => t('tech.appBuilds.statusElapsed', { vars: { minutes } }),
    };
    return [
      dateColumn<AppBuildRow>({
        field: 'created_at',
        headerName: t('tech.appBuilds.colWhen'),
        width: 165,
        // dateColumn defaults to hidden (built for audit tables); this one IS
        // the table's primary timestamp and its default sort.
        hide: false,
        formatDate: (d) => d.toLocaleString(),
      }),
      {
        field: 'status',
        headerName: t('tech.appBuilds.colStatus'),
        width: 110,
        filter: { type: 'select', options: makeStatusOptions(statusLabels) },
        cellRenderer: makeRenderStatus(statusLabels),
        valueGetter: (row) => row.status,
      },
      {
        field: 'version',
        headerName: t('tech.appBuilds.colVersion'),
        width: 110,
        filter: { type: 'text' },
        valueGetter: (row) => row.version,
      },
      {
        field: 'build_name',
        headerName: t('tech.appBuilds.colFile'),
        flex: 1,
        minWidth: 230,
        cellRenderer: renderBuild,
        valueGetter: (row) => row.build_name || row.build_no,
      },
      {
        field: 'commit_sha',
        headerName: t('tech.appBuilds.colCommit'),
        minWidth: 200,
        sortable: false,
        cellRenderer: renderCommit,
        valueGetter: (row) => row.commit_sha,
      },
      {
        field: 'files_changed',
        headerName: t('tech.appBuilds.colChanges'),
        width: 150,
        sortable: false,
        valueGetter: changesLabel,
      },
      {
        field: 'size_mb',
        // Wide enough for both of an Android build's files side by side.
        headerName: t('tech.appBuilds.colSize'),
        width: 175,
        valueGetter: sizeLabel,
      },
      {
        field: 'duration_seconds',
        headerName: t('tech.appBuilds.colDuration'),
        width: 95,
        valueGetter: durationLabel,
      },
      {
        field: 'branch',
        headerName: t('tech.appBuilds.colBranch'),
        width: 100,
        hide: true,
        filter: { type: 'text' },
        valueGetter: (row) => row.branch || '—',
      },
      {
        field: 'reported_by',
        headerName: t('tech.appBuilds.colReportedBy'),
        hide: true,
        minWidth: 180,
        valueGetter: (row) => row.reported_by || '—',
      },
      {
        field: 'slack_ts',
        headerName: t('tech.appBuilds.colSlack'),
        width: 105,
        sortable: false,
        cellRenderer: makeRenderSlack(
          t('tech.appBuilds.slackPosted'),
          t('tech.appBuilds.slackSkipped')
        ),
        valueGetter: (row) => (row.slack_ts ? 'posted' : 'skipped'),
      },
      {
        field: 'artifact_url',
        headerName: t('tech.appBuilds.colLinks'),
        // Room for two downloads plus the run and delete icons.
        width: 175,
        sortable: false,
        cellRenderer: makeRenderLinks(
          {
            download: (kind) => t('tech.appBuilds.downloadKind', { vars: { kind } }),
            run: t('tech.appBuilds.viewRun'),
            delete: t('tech.appBuilds.deleteAction'),
            noArtifact: t('tech.appBuilds.noArtifact'),
          },
          onDelete
        ),
        valueGetter: (row) => row.artifact_url,
      },
    ];
  }, [t, onDelete]);

  return (
    <DuncitTable<AppBuildRow>
      tableId={tableId}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('tech.appBuilds.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('tech.appBuilds.searchPlaceholder')}
      refetchRef={refetchRef}
      onRowClick={onRowClick}
    />
  );
}
