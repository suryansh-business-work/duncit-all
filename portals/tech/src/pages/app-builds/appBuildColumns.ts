import type { useTranslation } from '@duncit/shell';
import { dateColumn, type DuncitColumn } from '@duncit/table';
import {
  makeEnvOptions,
  makeRenderEnv,
  makeRenderLinks,
  makeRenderSlack,
  makeRenderStatus,
  makeRenderTriggeredBy,
  makeStatusOptions,
  renderBuild,
  renderCommit,
} from './cells';
import { makePlayStoreColumn } from './playStoreCells';
import { makeAppStoreColumn } from './appStoreCells';
import type { PushToPlay } from './usePlayStorePush';
import type { PushToAppStore } from './useAppStorePush';
import {
  changesLabel,
  durationLabel,
  sizeLabel,
  type AppBuildPlatform,
  type AppBuildRow,
} from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

/** The App Builds table's columns, typed so every one but the controls sorts and filters. */
export function makeAppBuildColumns(
  t: Translate,
  platform: AppBuildPlatform,
  onDelete: (row: AppBuildRow) => void,
  onPush: PushToPlay,
  onPushAppStore: PushToAppStore
): DuncitColumn<AppBuildRow>[] {
  const statusLabels = {
    QUEUED: t('tech.appBuilds.statusQueued'),
    RUNNING: t('tech.appBuilds.statusRunning'),
    SUCCESS: t('tech.appBuilds.statusSuccess'),
    FAILED: t('tech.appBuilds.statusFailed'),
    stale: t('tech.appBuilds.statusStale'),
    elapsed: (minutes: string) => t('tech.appBuilds.statusElapsed', { vars: { minutes } }),
  };
  const envLabels = {
    PRODUCTION: t('tech.appBuilds.envProduction'),
    STAGING: t('tech.appBuilds.envStaging'),
  };
  const triggerLabels = {
    PUSH: t('tech.appBuilds.triggerPush'),
    PORTAL: t('tech.appBuilds.triggerPortal'),
  };
  return [
    dateColumn<AppBuildRow>({
      field: 'created_at',
      headerName: t('tech.appBuilds.colWhen'),
      width: 165,
      // dateColumn defaults to hidden (built for audit tables); this one IS
      // the table's primary timestamp and its default sort.
      hide: false,
    }),
    {
      field: 'status',
      headerName: t('tech.appBuilds.colStatus'),
      width: 110,
      type: 'enum',
      options: makeStatusOptions(statusLabels),
      cellRenderer: makeRenderStatus(statusLabels),
      valueGetter: (row) => row.status,
    },
    {
      field: 'version',
      headerName: t('tech.appBuilds.colVersion'),
      width: 110,
      type: 'text',
      valueGetter: (row) => row.version,
    },
    {
      field: 'build_name',
      headerName: t('tech.appBuilds.colFile'),
      flex: 1,
      minWidth: 230,
      type: 'text',
      cellRenderer: renderBuild,
      valueGetter: (row) => row.build_name || row.build_no,
    },
    {
      field: 'commit_sha',
      headerName: t('tech.appBuilds.colCommit'),
      minWidth: 200,
      type: 'text',
      cellRenderer: renderCommit,
      valueGetter: (row) => row.commit_sha,
    },
    {
      field: 'files_changed',
      headerName: t('tech.appBuilds.colChanges'),
      width: 150,
      type: 'number',
      valueGetter: changesLabel,
    },
    {
      field: 'size_mb',
      // Wide enough for both of an Android build's files side by side.
      headerName: t('tech.appBuilds.colSize'),
      width: 175,
      type: 'number',
      valueGetter: sizeLabel,
    },
    {
      field: 'duration_seconds',
      headerName: t('tech.appBuilds.colDuration'),
      width: 95,
      type: 'number',
      valueGetter: durationLabel,
    },
    {
      field: 'app_env',
      headerName: t('tech.appBuilds.colEnv'),
      width: 120,
      type: 'enum',
      options: makeEnvOptions(envLabels),
      cellRenderer: makeRenderEnv(envLabels),
      valueGetter: (row) => row.app_env,
    },
    {
      field: 'triggered_by',
      headerName: t('tech.appBuilds.colTriggeredBy'),
      minWidth: 190,
      type: 'text',
      cellRenderer: makeRenderTriggeredBy(triggerLabels),
      valueGetter: (row) => row.triggered_by || '—',
    },
    {
      field: 'branch',
      headerName: t('tech.appBuilds.colBranch'),
      width: 100,
      hide: true,
      type: 'text',
      valueGetter: (row) => row.branch || '—',
    },
    {
      field: 'reported_by',
      headerName: t('tech.appBuilds.colReportedBy'),
      hide: true,
      minWidth: 180,
      type: 'text',
      valueGetter: (row) => row.reported_by || '—',
    },
    {
      // Posted or not — the server answers the flag as "has a Slack ts".
      field: 'slack_ts',
      headerName: t('tech.appBuilds.colSlack'),
      width: 105,
      type: 'boolean',
      cellRenderer: makeRenderSlack(
        t('tech.appBuilds.slackPosted'),
        t('tech.appBuilds.slackSkipped')
      ),
      valueGetter: (row) => (row.slack_ts ? 'posted' : 'skipped'),
    },
    // Only an AAB can go to Google Play and only an IPA to App Store Connect,
    // so each table offers its own store.
    platform === 'ANDROID' ? makePlayStoreColumn(t, onPush) : makeAppStoreColumn(t, onPushAppStore),
    {
      field: 'artifact_url',
      headerName: t('tech.appBuilds.colLinks'),
      // Room for two downloads plus the run and delete icons.
      width: 175,
      type: 'actions',
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
}
