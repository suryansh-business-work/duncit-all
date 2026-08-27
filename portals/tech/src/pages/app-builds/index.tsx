import { useCallback, useEffect, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Box, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { useConfirm, notifySuccess, notifyError } from '@duncit/dialogs';
import { useApolloTableFetch, type TableFetch } from '@duncit/table';
import AppBuildsTable from './AppBuildsTable';
import BuildDetailsDialog from './BuildDetailsDialog';
import { CreateBuildDialog } from './create-build';
import {
  APP_BUILDS_TABLE,
  DELETE_APP_BUILD,
  isLive,
  isStaleRunning,
  type AppBuildPlatform,
  type AppBuildRow,
} from './queries';

/**
 * How often a page showing a live build refreshes itself. A build takes 10–20
 * minutes, so this is about watching it tick over rather than catching the
 * moment it lands — often enough to feel live, rare enough that nobody notices
 * the traffic.
 */
const LIVE_POLL_MS = 15_000;

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
  const [creating, setCreating] = useState(false);
  const [removeBuild] = useMutation(DELETE_APP_BUILD);
  const [hasLiveBuild, setHasLiveBuild] = useState(false);
  const baseFetch = useApolloTableFetch<AppBuildRow>(
    client,
    APP_BUILDS_TABLE,
    'appBuildsTable',
    { extraVariables: { platform } },
    [platform]
  );

  // The page it just fetched is what decides whether to keep polling: no live
  // build on screen, no timer. A stale RUNNING row does not count — nothing is
  // coming to update it, so refreshing for it would spin forever.
  const fetchRows = useCallback<TableFetch<AppBuildRow>>(
    async (query) => {
      const page = await baseFetch(query);
      setHasLiveBuild(page.rows.some((r) => isLive(r) && !isStaleRunning(r)));
      return page;
    },
    [baseFetch]
  );

  useEffect(() => {
    if (!hasLiveBuild) return undefined;
    const timer = globalThis.setInterval(() => refetchRef.current?.(), LIVE_POLL_MS);
    return () => globalThis.clearInterval(timer);
  }, [hasLiveBuild]);

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
      <Stack
        direction="row"
        sx={{
          alignItems: "flex-start",
          justifyContent: "space-between",
          mb: 2
        }}>
        <Stack>
          <Typography variant="h5" sx={{
            fontWeight: 700
          }}>
            {title}
          </Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {subtitle}
          </Typography>
        </Stack>
        <DuncitButton variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>
          {t('tech.appBuilds.triggerAction')}
        </DuncitButton>
      </Stack>
      <AppBuildsTable
        platform={platform}
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onRowClick={openRow}
        onDelete={onDelete}
      />
      <BuildDetailsDialog build={selected} onClose={closeRow} />
      <CreateBuildDialog
        open={creating}
        platform={platform}
        onClose={() => setCreating(false)}
        onQueued={() => refetchRef.current?.()}
      />
    </Box>
  );
}
