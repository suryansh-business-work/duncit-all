import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Stack } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import { DuncitButton } from '@duncit/buttons';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useApolloTableFetch, type TableFetch } from '@duncit/table';
import LivePulse from '../components/LivePulse';
import StressRunsTable from './StressRunsTable';
import { NewStressRunDialog } from '../new-run';
import { DELETE_STRESS_RUN, STRESS_RUNS_TABLE, isLiveRun, type StressRun } from '../queries';

/** A page showing a live run refreshes this often; with none on screen it does not poll. */
const LIVE_POLL_MS = 10_000;

/**
 * Tech > Stress Testing > Runs.
 *
 * The live pulse sits above the history because it answers the question you
 * open this page with — how many people are on the platform, and how hard the
 * server is working, RIGHT NOW — before you decide to add load to it.
 */
export default function StressRunsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const client = useApolloClient();
  const confirm = useConfirm();
  const refetchRef = useRef<(() => void) | null>(null);
  const [starting, setStarting] = useState(false);
  const [hasLiveRun, setHasLiveRun] = useState(false);
  const [removeRun] = useMutation<{ deleteStressRun: boolean }>(DELETE_STRESS_RUN);
  const baseFetch = useApolloTableFetch<StressRun>(client, STRESS_RUNS_TABLE, 'stressRunsTable');

  const fetchRows = useCallback<TableFetch<StressRun>>(
    async (query) => {
      const page = await baseFetch(query);
      setHasLiveRun(page.rows.some((row) => isLiveRun(row.status)));
      return page;
    },
    [baseFetch]
  );

  useEffect(() => {
    if (!hasLiveRun) return undefined;
    const timer = globalThis.setInterval(() => refetchRef.current?.(), LIVE_POLL_MS);
    return () => globalThis.clearInterval(timer);
  }, [hasLiveRun]);

  const openRun = useCallback((row: StressRun) => navigate(`/stress-testing/runs/${row.id}`), [navigate]);

  const onDelete = useCallback(
    async (row: StressRun) => {
      const ok = await confirm({
        title: t('tech.stress.deleteTitle'),
        message: t('tech.stress.deleteMessage', { vars: { run: row.run_no } }),
        confirmLabel: t('shell.common.delete'),
        destructive: true,
      });
      if (!ok) return;
      try {
        await removeRun({ variables: { id: row.id } });
        notifySuccess(t('tech.stress.deleted'));
        refetchRef.current?.();
      } catch (err) {
        notifyError(err instanceof Error ? err.message : String(err));
      }
    },
    [confirm, removeRun, t]
  );

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title={t('tech.stress.runsTitle')}
        subtitle={t('tech.stress.runsSubtitle')}
        actions={
          <DuncitButton variant="contained" color="error" startIcon={<BoltIcon />} onClick={() => setStarting(true)}>
            {t('tech.stress.newRun')}
          </DuncitButton>
        }
      />
      <LivePulse />
      <StressRunsTable fetchRows={fetchRows} refetchRef={refetchRef} onRowClick={openRun} onDelete={onDelete} />
      <NewStressRunDialog
        open={starting}
        onClose={() => setStarting(false)}
        onStarted={(id) => navigate(`/stress-testing/runs/${id}`)}
      />
    </Stack>
  );
}
