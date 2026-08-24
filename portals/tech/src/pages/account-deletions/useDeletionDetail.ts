import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
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

  const { data, loading, refetch } = useQuery(ACCOUNT_DELETION_DETAIL, {
    variables: { request_doc_id: requestDocId },
    skip: !requestDocId,
    fetchPolicy: 'cache-and-network',
  });

  const [purgeTrace] = useMutation(PURGE_ACCOUNT_TRACE);
  const [purgeAll] = useMutation(PURGE_ACCOUNT_COMPLETELY);
  const [reject] = useMutation(REJECT_ACCOUNT_DELETION);

  const detail: DeletionDetail | null = data?.accountDeletionRequest ?? null;

  const fail = useCallback(
    (e: unknown) => notifyError(e instanceof Error ? e.message : String(e)),
    []
  );

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

  const deleteEverything = useCallback(async () => {
    if (!requestDocId) return false;
    setPurgingAll(true);
    try {
      await purgeAll({ variables: { request_doc_id: requestDocId } });
      notifySuccess(t('tech.accountDeletions.accountRemoved'));
      onChanged();
      return true;
    } catch (e) {
      fail(e);
      return false;
    } finally {
      setPurgingAll(false);
    }
  }, [requestDocId, purgeAll, t, onChanged, fail]);

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
    refetch,
    deleteGroup,
    deleteEverything,
    rejectRequest,
  };
}
