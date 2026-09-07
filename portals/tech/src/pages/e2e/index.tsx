import { useCallback, useEffect, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Box, Stack, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { useConfirm, notifySuccess, notifyError } from '@duncit/dialogs';
import { useApolloTableFetch, type TableFetch } from '@duncit/table';
import E2eRunsTable from './E2eRunsTable';
import RunDetailsDialog from './RunDetailsDialog';
import { RunTestsDialog } from './run-tests';
import { DELETE_E2E_RUN, E2E_RUNS_TABLE, isLive, isStaleRunning, type E2eRunRow } from './queries';

/**
 * How often a page showing a live run refreshes itself. A full sweep takes
 * twenty to forty minutes, so this is about watching legs land rather than
 * catching the moment it finishes — often enough to feel live, rare enough that
 * nobody notices the traffic.
 */
const LIVE_POLL_MS = 15_000;

/**
 * E2E Tests — one row per run of the end-to-end suite.
 *
 * The rows come from the E2E workflow, which reports every leg as it lands: the
 * nightly run the server dispatches on the configured schedule, the ones
 * started from Run tests here, and the ones started by hand from the Actions
 * tab. This table is the store of record — a GitHub run log expires, this
 * does not.
 */
export default function E2eRunsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const confirm = useConfirm();
  const refetchRef = useRef<(() => void) | null>(null);
  const [selected, setSelected] = useState<E2eRunRow | null>(null);
  const [starting, setStarting] = useState(false);
  const [removeRun] = useMutation<any>(DELETE_E2E_RUN);
  const [hasLiveRun, setHasLiveRun] = useState(false);
  const baseFetch = useApolloTableFetch<E2eRunRow>(client, E2E_RUNS_TABLE, 'e2eRunsTable');

  // The page it just fetched is what decides whether to keep polling: no live
  // run on screen, no timer. A stale RUNNING row does not count — nothing is
  // coming to update it, so refreshing for it would spin forever.
  const fetchRows = useCallback<TableFetch<E2eRunRow>>(
    async (query) => {
      const page = await baseFetch(query);
      setHasLiveRun(page.rows.some((row) => isLive(row) && !isStaleRunning(row)));
      return page;
    },
    [baseFetch]
  );

  useEffect(() => {
    if (!hasLiveRun) return undefined;
    const timer = globalThis.setInterval(() => refetchRef.current?.(), LIVE_POLL_MS);
    return () => globalThis.clearInterval(timer);
  }, [hasLiveRun]);

  const openRow = useCallback((row: E2eRunRow) => setSelected(row), []);
  const closeRow = useCallback(() => setSelected(null), []);

  const onDelete = useCallback(
    async (row: E2eRunRow) => {
      const ok = await confirm({
        title: t('tech.e2e.deleteTitle'),
        message: t('tech.e2e.deleteMessage', { vars: { run: row.run_no } }),
        confirmLabel: t('tech.e2e.deleteAction'),
        destructive: true,
      });
      if (!ok) return;
      try {
        await removeRun({ variables: { id: row.id } });
        notifySuccess(t('tech.e2e.deleted'));
        refetchRef.current?.();
      } catch (err) {
        notifyError(err instanceof Error ? err.message : String(err));
      }
    },
    [confirm, removeRun, t]
  );

  return (
    <Box>
      <Stack
        direction="row"
        sx={{ alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}
      >
        <Stack>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {t('tech.e2e.runsTitle')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('tech.e2e.runsSubtitle')}
          </Typography>
        </Stack>
        <DuncitButton
          variant="contained"
          startIcon={<PlayArrowIcon />}
          onClick={() => setStarting(true)}
        >
          {t('tech.e2e.triggerAction')}
        </DuncitButton>
      </Stack>
      <E2eRunsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onRowClick={openRow}
        onDelete={onDelete}
      />
      <RunDetailsDialog run={selected} onClose={closeRow} />
      <RunTestsDialog
        open={starting}
        onClose={() => setStarting(false)}
        onQueued={() => refetchRef.current?.()}
      />
    </Box>
  );
}
