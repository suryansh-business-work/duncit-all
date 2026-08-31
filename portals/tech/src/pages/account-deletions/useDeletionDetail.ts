import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import {
  ACCOUNT_DELETION_DETAIL,
  PURGE_ACCOUNT_COMPLETELY,
  PURGE_ACCOUNT_TRACE,
  REJECT_ACCOUNT_DELETION,
  type DeletionDetail,
  type TraceGroup,
} from './queries';
import { groupKey } from './TraceList';

const REDACTS = 'REDACT_RECORDS';

/** The key of the closing step, which is the account document itself. */
export const ACCOUNT_STEP_KEY = '__account__';

export type PurgeStepStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';

/** One line of the run: what is being cleared, and how far it got. */
export interface PurgeStep {
  key: string;
  collection: string;
  field: string;
  /** What the trace said before the run started — the number being watched. */
  expected: number;
  /** A retained record is redacted, not deleted, and the line has to say so. */
  redacts: boolean;
  status: PurgeStepStatus;
  /** How many documents the server actually changed. */
  removed: number;
}

function toStep(group: TraceGroup): PurgeStep {
  return {
    key: groupKey(group),
    collection: group.collection_name,
    field: group.field_path,
    expected: group.count,
    redacts: group.purge_kind === REDACTS,
    status: 'PENDING',
    removed: 0,
  };
}

/** The `removed` the server just wrote, read back off the log it wrote it to. */
function lastRemoved(detail: DeletionDetail | undefined): number {
  const log = detail?.request?.purge_log ?? [];
  return log.at(-1)?.removed ?? 0;
}

/**
 * The detail dialog's data and its three destructive calls.
 *
 * Each mutation answers the WHOLE detail again rather than a boolean, so the
 * trace on screen is always the trace on disk — a list that only removed the
 * row it just deleted would keep offering counts that stopped being true the
 * moment somebody else wrote to that collection.
 */
export function useDeletionDetail(requestDocId: string | null, onChanged: () => void) {
  const { t } = useTranslation();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [purgingAll, setPurgingAll] = useState(false);
  const [steps, setSteps] = useState<PurgeStep[]>([]);

  const { data, loading, refetch } = useQuery<any>(ACCOUNT_DELETION_DETAIL, {
    variables: { request_doc_id: requestDocId },
    skip: !requestDocId,
    fetchPolicy: 'cache-and-network',
  });

  const [purgeTrace] = useMutation<any>(PURGE_ACCOUNT_TRACE);
  const [purgeAll] = useMutation<any>(PURGE_ACCOUNT_COMPLETELY);
  const [reject] = useMutation<any>(REJECT_ACCOUNT_DELETION);

  const detail: DeletionDetail | null = data?.accountDeletionRequest ?? null;

  const fail = useCallback(
    (e: unknown) => notifyError(e instanceof Error ? e.message : String(e)),
    []
  );

  const patchStep = useCallback((key: string, patch: Partial<PurgeStep>) => {
    setSteps((prev) => prev.map((step) => (step.key === key ? { ...step, ...patch } : step)));
  }, []);

  const deleteGroup = useCallback(
    async (group: TraceGroup) => {
      if (!requestDocId) return;
      setBusyKey(groupKey(group));
      try {
        await purgeTrace({
          variables: {
            input: {
              request_doc_id: requestDocId,
              model_name: group.model_name,
              field_path: group.field_path,
            },
          },
        });
        notifySuccess(t('tech.accountDeletions.done'));
        onChanged();
      } catch (e) {
        fail(e);
      } finally {
        setBusyKey(null);
      }
    },
    [requestDocId, purgeTrace, t, onChanged, fail]
  );

  /**
   * Carry the request out one reference at a time, then close it.
   *
   * Driven from here rather than in a single server call because an operator
   * watching a spinner has no idea whether a purge is working through seventy
   * collections or has hung on the first — and this is the one action in the
   * portal that cannot be walked back, so "it is doing something" is not enough
   * to know. Each step is its own transaction on the server: the rows it clears
   * and the log entry naming them commit together, so a run that stops halfway
   * leaves an accurate record of exactly how far it got and the remaining
   * references still counted for the next attempt.
   *
   * The final step re-counts on the server before removing the account, so a
   * reference that appeared while this was running is still caught.
   */
  const deleteEverything = useCallback(async () => {
    if (!requestDocId) return false;
    const groups = detail?.trace ?? [];
    const plan = groups.map(toStep);
    setSteps([
      ...plan,
      {
        key: ACCOUNT_STEP_KEY,
        collection: t('tech.accountDeletions.stepAccount'),
        field: '',
        expected: 1,
        redacts: false,
        status: 'PENDING',
        removed: 0,
      },
    ]);
    setPurgingAll(true);
    try {
      for (const step of plan) {
        const group = groups.find((g) => groupKey(g) === step.key);
        if (!group) continue;
        patchStep(step.key, { status: 'RUNNING' });
        const res = await purgeTrace({
          variables: {
            input: {
              request_doc_id: requestDocId,
              model_name: group.model_name,
              field_path: group.field_path,
            },
          },
        });
        patchStep(step.key, {
          status: 'DONE',
          removed: lastRemoved(res.data?.purgeAccountTrace),
        });
      }
      patchStep(ACCOUNT_STEP_KEY, { status: 'RUNNING' });
      await purgeAll({ variables: { request_doc_id: requestDocId } });
      patchStep(ACCOUNT_STEP_KEY, { status: 'DONE', removed: 1 });
      notifySuccess(t('tech.accountDeletions.accountRemoved'));
      onChanged();
      return true;
    } catch (e) {
      // Whichever step was mid-flight is the one that failed; the ones before
      // it are committed and stay marked done.
      setSteps((prev) =>
        prev.map((step) => (step.status === 'RUNNING' ? { ...step, status: 'FAILED' } : step))
      );
      fail(e);
      onChanged();
      return false;
    } finally {
      setPurgingAll(false);
    }
  }, [requestDocId, detail, purgeTrace, purgeAll, patchStep, t, onChanged, fail]);

  const rejectRequest = useCallback(
    async (note: string) => {
      if (!requestDocId) return false;
      try {
        await reject({ variables: { request_doc_id: requestDocId, note } });
        notifySuccess(t('tech.accountDeletions.done'));
        onChanged();
        return true;
      } catch (e) {
        fail(e);
        return false;
      }
    },
    [requestDocId, reject, t, onChanged, fail]
  );

  return {
    detail,
    loading,
    busyKey,
    purgingAll,
    steps,
    resetSteps: useCallback(() => setSteps([]), []),
    refetch,
    deleteGroup,
    deleteEverything,
    rejectRequest,
  };
}
