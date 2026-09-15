import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { notifyError, useConfirm } from '@duncit/dialogs';
import { downloadTextFile } from '@duncit/utils';
import RunHeader from './RunHeader';
import RunKpis from './RunKpis';
import RunCharts from './RunCharts';
import EventLog from './EventLog';
import ProfileCard from './ProfileCard';
import VerdictCard from './verdict';
import { buildRunReport } from './report/runReport';
import BotsTable from './tables/BotsTable';
import ContainersTable from './tables/ContainersTable';
import EndpointsTable from './tables/EndpointsTable';
import {
  STOP_STRESS_RUN,
  STRESS_RUN,
  STRESS_RUN_SAMPLES,
  STRESS_RUN_SHARDS,
  isLiveRun,
  type StressRun,
  type StressSample,
  type StressShard,
} from '../queries';

/** The server samples every five seconds; reading faster only re-draws the same point. */
const LIVE_POLL_MS = 5_000;

/**
 * One stress run at its own address — live while it runs, the record once it
 * ends. Every poll stops by itself when the run is no longer live.
 */
export default function StressRunDetailPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { runId = '' } = useParams();
  const [live, setLive] = useState(false);
  const pollInterval = live ? LIVE_POLL_MS : 0;
  // The run row polls on the same beat as the samples, so status, peaks and the
  // log keep up — and stops once the run it just read is no longer live.
  const runQuery = useQuery<{ stressRun: StressRun }>(STRESS_RUN, {
    variables: { id: runId },
    fetchPolicy: 'cache-and-network',
    pollInterval,
  });
  const run = runQuery.data?.stressRun ?? null;
  useEffect(() => {
    setLive(run ? isLiveRun(run.status) : false);
  }, [run]);

  const samplesQuery = useQuery<{ stressRunSamples: StressSample[] }>(STRESS_RUN_SAMPLES, {
    variables: { id: runId },
    skip: !run,
    pollInterval,
    fetchPolicy: 'network-only',
  });
  const shardsQuery = useQuery<{ stressRunShards: StressShard[] }>(STRESS_RUN_SHARDS, {
    variables: { id: runId },
    skip: !live,
    pollInterval,
    fetchPolicy: 'network-only',
  });
  const [stopRun] = useMutation(STOP_STRESS_RUN);

  const samples = samplesQuery.data?.stressRunSamples ?? [];
  const latest = samples.at(-1) ?? null;
  const shards = shardsQuery.data?.stressRunShards ?? [];

  const onStop = useCallback(async () => {
    if (!run) return;
    const ok = await confirm({
      title: t('tech.stress.stopTitle'),
      message: t('tech.stress.stopMessage', { vars: { run: run.run_no } }),
      confirmLabel: t('tech.stress.stopRun'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await stopRun({ variables: { id: run.id } });
      await runQuery.refetch();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : String(err));
    }
  }, [confirm, run, runQuery, stopRun, t]);

  const onDownload = useCallback(() => {
    if (!run) return;
    downloadTextFile(buildRunReport(t, run, samples), `${run.run_no}-stress-report.html`);
  }, [run, samples, t]);

  return (
    <QueryGuard loading={runQuery.loading && !run} error={runQuery.error} errorText={runQuery.error?.message}>
      {run && (
        <Stack spacing={2.5}>
          <RunHeader run={run} onStop={onStop} onDownload={onDownload} />
          <RunKpis run={run} latest={latest} />
          <VerdictCard run={run} />
          <RunCharts samples={samples} startedAt={run.started_at} />
          {live && <BotsTable shards={shards} />}
          {latest && latest.containers.length > 0 && <ContainersTable containers={latest.containers} />}
          {run.endpoints.length > 0 && <EndpointsTable endpoints={run.endpoints} />}
          <EventLog events={run.events} />
          <ProfileCard run={run} />
        </Stack>
      )}
    </QueryGuard>
  );
}
