import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { useConfirm, notifySuccess, notifyError } from '@duncit/dialogs';
import { useApolloTableFetch } from '@duncit/table';
import AppBuildsTable from './AppBuildsTable';
import BuildDetailsDialog from './BuildDetailsDialog';
import {
  APP_BUILDS_TABLE,
  DELETE_APP_BUILD,
  type AppBuildPlatform,
  type AppBuildRow,
} from './queries';

interface Props {
  platform: AppBuildPlatform;
}

/**
 * App Builds — one row per CI build of the mobile app. The android-build /
 * ios-build workflows report every merge-to-main build here (artifact stored on
 * the VPS, announcement on Slack); this table is the store of record.
 */
export default function AppBuildsPage({ platform }: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const confirm = useConfirm();
  const refetchRef = useRef<(() => void) | null>(null);
  const [selected, setSelected] = useState<AppBuildRow | null>(null);
  const [removeBuild] = useMutation(DELETE_APP_BUILD);
  const fetchRows = useApolloTableFetch<AppBuildRow>(
    client,
    APP_BUILDS_TABLE,
    'appBuildsTable',
    { extraVariables: { platform } },
    [platform]
  );
  const openRow = useCallback((row: AppBuildRow) => setSelected(row), []);
  const closeRow = useCallback(() => setSelected(null), []);

  // Deleting takes the stored artifact with it, so the confirm names the build
  // and says the download goes too — there is no undo behind this button.
  const onDelete = useCallback(
    async (row: AppBuildRow) => {
      const ok = await confirm({
        title: t('tech.appBuilds.deleteTitle'),
        message: t('tech.appBuilds.deleteMessage', {
          vars: { build: row.build_name || row.build_no },
        }),
        confirmLabel: t('tech.appBuilds.deleteAction'),
        destructive: true,
      });
      if (!ok) return;
      try {
        await removeBuild({ variables: { id: row.id } });
        notifySuccess(t('tech.appBuilds.deleted'));
        refetchRef.current?.();
      } catch (err) {
        notifyError(err instanceof Error ? err.message : String(err));
      }
    },
    [confirm, removeBuild, t]
  );

  const title =
    platform === 'ANDROID' ? t('tech.appBuilds.androidTitle') : t('tech.appBuilds.iosTitle');
  const subtitle =
    platform === 'ANDROID' ? t('tech.appBuilds.androidSubtitle') : t('tech.appBuilds.iosSubtitle');

  return (
    <Box>
      <Stack sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      </Stack>
      <AppBuildsTable
        platform={platform}
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onRowClick={openRow}
        onDelete={onDelete}
      />
      <BuildDetailsDialog build={selected} onClose={closeRow} />
    </Box>
  );
}
