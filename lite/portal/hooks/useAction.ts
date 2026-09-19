import { useCallback } from 'react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';

/**
 * One way to run a mutation from a page: await it, say it worked, reload
 * whatever the page lists; or show the API's message. Every console action
 * goes through here so no page grows its own try/catch/notify.
 */
export function useAction(onDone?: () => void) {
  return useCallback(
    async (work: () => Promise<unknown>, successMessage: string): Promise<boolean> => {
      try {
        await work();
        notifySuccess(successMessage);
        onDone?.();
        return true;
      } catch (error) {
        notifyError(parseApiError(error));
        return false;
      }
    },
    [onDone],
  );
}
