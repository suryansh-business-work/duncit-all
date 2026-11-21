import { useCallback } from 'react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { copyToClipboard } from '@duncit/utils';
import { useDetailCopy } from '../../i18n/useDetailCopy';

/**
 * Copy text and say whether it worked. The clipboard refuses on an insecure
 * origin or an unfocused page; a "Copied" toast for a copy that never landed is
 * worse than none, so the failure is said out loud too.
 */
export function useCopyText() {
  const copy = useDetailCopy();
  return useCallback(
    async (text: string, done: string): Promise<boolean> => {
      const ok = await copyToClipboard(text);
      if (ok) notifySuccess(done);
      else notifyError(copy.actions.copyFailed);
      return ok;
    },
    [copy],
  );
}
