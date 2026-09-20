import { useCallback, useEffect, useRef } from 'react';
import { notify, notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '../i18n/useTranslation';
import type { BackgroundJob, BackgroundJobKind, BackgroundJobStatus } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

/** How each kind says it ended — literal keys, so the localization gate sees them. */
const NOTICE_COPY: Readonly<Record<BackgroundJobKind, { stopped: string; partial: string; done: string }>> = {
  BULK_DELETE: {
    stopped: 'shell.jobs.stoppedNotice',
    partial: 'shell.jobs.partialNotice',
    done: 'shell.jobs.doneNotice',
  },
  AI_TRANSLATE: {
    stopped: 'shell.jobs.translateStoppedNotice',
    partial: 'shell.jobs.translatePartialNotice',
    done: 'shell.jobs.translateDoneNotice',
  },
};

/** Say how a job ended. A cancel was the person's own doing, so it passes quietly. */
function announce(job: BackgroundJob, t: Translate): void {
  const copy = NOTICE_COPY[job.kind];
  const vars = { label: job.label, reason: job.error_message };
  if (job.status === 'FAILED') {
    notifyError(t(copy.stopped, { vars }));
  } else if (job.status === 'COMPLETED' && job.failed > 0) {
    // `deleted` and `translated` are the same count, named for each kind's sentence.
    const counts = { deleted: job.succeeded, translated: job.succeeded, failed: job.failed };
    notify(t(copy.partial, { vars: { ...vars, ...counts } }), 'warning');
  } else if (job.status === 'COMPLETED') {
    notifySuccess(t(copy.done, { count: job.succeeded, vars }));
  }
}

/**
 * Notices the moment a job stops running.
 *
 * Only a job SEEN running counts, so reopening a console full of finished jobs
 * announces nothing. `track` marks a job the caller has just started, which
 * covers the one that finishes before the list is next read.
 *
 * `subscribe` lets a grid ask to be told when a job on its table ends — the
 * rows it deleted are still on screen until the grid refetches.
 */
export function useJobSettlement(jobs: readonly BackgroundJob[]) {
  const { t } = useTranslation();
  const lastStatus = useRef(new Map<string, BackgroundJobStatus>());
  const listeners = useRef(new Map<string, Set<() => void>>());

  useEffect(() => {
    for (const job of jobs) {
      const before = lastStatus.current.get(job.id);
      lastStatus.current.set(job.id, job.status);
      if (before !== 'RUNNING' || job.status === 'RUNNING') continue;
      listeners.current.get(job.table)?.forEach((listener) => listener());
      announce(job, t);
    }
  }, [jobs, t]);

  const track = useCallback((id: string) => {
    lastStatus.current.set(id, 'RUNNING');
  }, []);

  const subscribe = useCallback((table: string, listener: () => void) => {
    const set = listeners.current.get(table) ?? new Set<() => void>();
    set.add(listener);
    listeners.current.set(table, set);
    return () => {
      set.delete(listener);
    };
  }, []);

  return { track, subscribe };
}
