import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { DISABLE_AI_PROMPT_SHARE, ENABLE_AI_PROMPT_SHARE, RESTORE_AI_PROMPT_VERSION } from '../../detailQueries';
import { useDetailCopy } from '../../i18n/useDetailCopy';

/**
 * The detail view's writes — public sharing and restoring a version — each
 * followed by a fresh read of the detail, so what is on screen is what the
 * server now holds. `onChanged` tells the library behind the dialog that its
 * list may have moved (a restore can change a name, category or body).
 */
export function useDetailMutations(promptId: string | null, refetch: () => Promise<unknown>, onChanged: () => void) {
  const copy = useDetailCopy();
  const [enable, enabling] = useMutation(ENABLE_AI_PROMPT_SHARE);
  const [disable, disabling] = useMutation(DISABLE_AI_PROMPT_SHARE);
  const [restoreMutation, restoring] = useMutation(RESTORE_AI_PROMPT_VERSION);
  const [shareError, setShareError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const run = async (write: () => Promise<unknown>, setError: (message: string | null) => void): Promise<boolean> => {
    setError(null);
    try {
      await write();
      await refetch();
      return true;
    } catch (err) {
      setError(parseApiError(err));
      return false;
    }
  };

  return {
    shareBusy: enabling.loading || disabling.loading,
    shareError,
    enableShare: (regenerate: boolean) =>
      run(() => enable({ variables: { id: promptId, regenerate } }), setShareError),
    disableShare: () => run(() => disable({ variables: { id: promptId } }), setShareError),
    restoring: restoring.loading,
    historyError,
    restore: async (version: number) => {
      const ok = await run(() => restoreMutation({ variables: { id: promptId, version } }), setHistoryError);
      if (ok) {
        notifySuccess(copy.history.restored);
        onChanged();
      }
    },
  };
}
