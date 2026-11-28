import { useCallback } from 'react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { firstGraphQLError } from '@duncit/utils';

/**
 * Every HR write goes through here: a success toast, and on failure the
 * server's own sentence for a refused input (it names the rule that failed),
 * the "someone else changed it" message for a lost race, or a generic retry
 * message — never a silent failure. Resolves to the result, or null.
 */
export function useHrWrite() {
  const { t } = useTranslation();
  return useCallback(
    async <T>(action: string, write: () => Promise<T | null | undefined>, successKey: string): Promise<T | null> => {
      try {
        const result = await write();
        notifySuccess(t(successKey));
        return result ?? null;
      } catch (error) {
        const graphQLError = firstGraphQLError(error);
        const code = graphQLError?.extensions?.code;
        logs.portal.hr.error('useHrWrite', action, { error, code });
        if (code === 'CONFLICT') notifyError(graphQLError?.message || t('hrEmployee.toast.conflict'));
        else if (code === 'BAD_USER_INPUT' && graphQLError?.message) notifyError(graphQLError.message);
        else notifyError(t('hrEmployee.toast.failed'));
        return null;
      }
    },
    [t]
  );
}
