import { useMemo, type MutableRefObject } from 'react';
import { useTranslation } from '@duncit/shell';
import { DuncitTable, type TableFetch } from '@duncit/table';
import { getRowId } from './cells';
import { makeAppBuildColumns } from './appBuildColumns';
import type { PushToPlay } from './usePlayStorePush';
import type { PushToAppStore } from './useAppStorePush';
import type { AppBuildPlatform, AppBuildRow } from './queries';

interface Props {
  platform: AppBuildPlatform;
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
  fetchRows,
  refetchRef,
  onRowClick,
  onDelete,
  onPush,
  onPushAppStore,
  ariaLabel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const tableId = platform === 'ANDROID' ? 'tech-app-builds-android' : 'tech-app-builds-ios';
  const columns = useMemo(
    () => makeAppBuildColumns(t, platform, onDelete, onPush, onPushAppStore),
    [t, onDelete, onPush, onPushAppStore, platform]
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
