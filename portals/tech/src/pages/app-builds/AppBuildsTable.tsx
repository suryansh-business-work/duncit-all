import { useMemo, type MutableRefObject } from 'react';
import { useTranslation } from '@duncit/shell';
import { DuncitTable, type TableFetch } from '@duncit/table';
import { getRowId } from './cells';
import { makeAppBuildColumns } from './appBuildColumns';
import type { PushToPlay } from './usePlayStorePush';
import type { PushToAppStore } from './useAppStorePush';
import type { AppBuildApp, AppBuildPlatform, AppBuildRow } from './queries';

interface Props {
  platform: AppBuildPlatform;
  app?: AppBuildApp;
  fetchRows: TableFetch<AppBuildRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onRowClick: (row: AppBuildRow) => void;
  onDelete: (row: AppBuildRow) => void;
  onPush: PushToPlay;
  onPushAppStore: PushToAppStore;
  /** The page heading — names the grid for screen readers and its bulk deletes in the header. */
  ariaLabel: string;
}

export default function AppBuildsTable({
  platform,
  app = 'DUNCIT',
  fetchRows,
  refetchRef,
  onRowClick,
  onDelete,
  onPush,
  onPushAppStore,
  ariaLabel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  let tableId = platform === 'ANDROID' ? 'tech-app-builds-android' : 'tech-app-builds-ios';
  // The CRM Android id predates the iOS table and keeps saved column choices.
  if (app === 'CRM') tableId = platform === 'ANDROID' ? 'tech-app-builds-crm' : 'tech-app-builds-crm-ios';
  // CRM builds never go to a store from here, so their tables have no store column.
  const withStore = app !== 'CRM';
  const columns = useMemo(
    () => makeAppBuildColumns(t, platform, onDelete, onPush, onPushAppStore, withStore),
    [t, onDelete, onPush, onPushAppStore, platform, withStore]
  );

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
      ariaLabel={ariaLabel}
    />
  );
}
