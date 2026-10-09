import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useConfirm, notifyError } from '@duncit/dialogs';
import { fireAndForget, logs } from '@duncit/logs';
import { useBackgroundJobs, useTranslation } from '@duncit/shell';
import {
  APPLY_MEDIA_ORGANIZER_RUN,
  BACKGROUND_JOBS_QUERY,
  MEDIA_ORGANIZER_RUNS,
  ROLLBACK_MEDIA_ORGANIZER_RUN,
  START_MEDIA_ORGANIZER,
  type OrganizerRun,
} from './queries';

/** How often the run counts refresh while a job is moving them. */
const POLL_MS = 3000;

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * Database > Media Organizer: the runs, and the three things an operator does
 * with them — scan (dry or not), copy a dry run's findings, roll one back.
 *
 * The work itself is a background job, so its progress is the header's; this
 * page only polls the run counts while an organizer job is running, and once
 * more when it stops.
 */
export function useMediaOrganizer() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const jobs = useBackgroundJobs();
  const running = !!jobs?.jobs.some((job) => job.kind === 'MEDIA_ORGANIZE' && job.status === 'RUNNING');
  const [selectedRun, setSelectedRun] = useState<string | null>(null);

  const runsQuery = useQuery<{ mediaOrganizerRuns: OrganizerRun[] }>(MEDIA_ORGANIZER_RUNS, {
    fetchPolicy: 'cache-and-network',
    pollInterval: running ? POLL_MS : 0,
  });
  const refetchRuns = runsQuery.refetch;

  // The last poll can land just before the job's final batch is written.
  const wasRunning = useRef(running);
  useEffect(() => {
    if (wasRunning.current && !running) fireAndForget(refetchRuns(), logs.portal.tech, 'MediaOrganizer', 'refetchRuns');
    wasRunning.current = running;
  }, [running, refetchRuns]);

  const options = { refetchQueries: [BACKGROUND_JOBS_QUERY, 'MediaOrganizerRuns'] };
  const [startMutation, startState] = useMutation(START_MEDIA_ORGANIZER, options);
  const [applyMutation, applyState] = useMutation(APPLY_MEDIA_ORGANIZER_RUN, options);
  const [rollbackMutation, rollbackState] = useMutation(ROLLBACK_MEDIA_ORGANIZER_RUN, options);
  const url = typeof window === 'undefined' ? '' : window.location.pathname;

  const start = useCallback(
    async (dryRun: boolean) => {
      if (!dryRun) {
        const ok = await confirm({
          title: t('tech.mediaOrganizer.startConfirmTitle'),
          message: t('tech.mediaOrganizer.startConfirmMessage'),
          confirmLabel: t('tech.mediaOrganizer.startConfirm'),
        });
        if (!ok) return;
      }
      await startMutation({ variables: { dry_run: dryRun, url } }).catch((error: unknown) => notifyError(messageOf(error)));
    },
    [confirm, startMutation, t, url],
  );

  const apply = useCallback(
    async (run: OrganizerRun) => {
      const ok = await confirm({
        title: t('tech.mediaOrganizer.applyConfirmTitle'),
        message: t('tech.mediaOrganizer.applyConfirmMessage', { vars: { count: run.PENDING } }),
        confirmLabel: t('tech.mediaOrganizer.apply'),
      });
      if (!ok) return;
      await applyMutation({ variables: { run_id: run.run_id, url } }).catch((error: unknown) => notifyError(messageOf(error)));
    },
    [applyMutation, confirm, t, url],
  );

  const rollback = useCallback(
    async (run: OrganizerRun) => {
      const ok = await confirm({
        title: t('tech.mediaOrganizer.rollbackConfirmTitle'),
        message: t('tech.mediaOrganizer.rollbackConfirmMessage', { vars: { count: run.DONE } }),
        confirmLabel: t('tech.mediaOrganizer.rollback'),
        destructive: true,
      });
      if (!ok) return;
      await rollbackMutation({ variables: { run_id: run.run_id, url } }).catch((error: unknown) => notifyError(messageOf(error)));
    },
    [confirm, rollbackMutation, t, url],
  );

  return {
    runs: runsQuery.data?.mediaOrganizerRuns ?? [],
    loading: runsQuery.loading && !runsQuery.data,
    loadError: runsQuery.error ? t('tech.mediaOrganizer.loadError') : null,
    running,
    busy: running || startState.loading || applyState.loading || rollbackState.loading,
    starting: startState.loading,
    selectedRun,
    setSelectedRun,
    start,
    apply,
    rollback,
  };
}
