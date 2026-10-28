import { useCallback, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import type { ManualTestCaseInput } from '@duncit/gql-types';
import { notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { UPDATE_MANUAL_CASE, type UpdateCaseData, type UpdateCaseVariables } from '../shared/case.queries';
import { testsLog } from '../../../lib/logger';
import { isConflict, manualErrorText } from '../shared/errors';
import type { ManualCase } from '../shared/types';

/** Where one section's save stands, for the status line beside its buttons. */
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Save one section of a case. Every save carries the `updated_at` the page
 * was showing, so a change someone else saved meanwhile is refused instead of
 * overwritten — the page then reloads the case and says so. The answer is the
 * whole case, which Apollo writes over the open page.
 */
export function useSectionSave(record: Pick<ManualCase, 'id' | 'updated_at'>, component: string) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [update] = useMutation<UpdateCaseData, UpdateCaseVariables>(UPDATE_MANUAL_CASE);
  const [state, setState] = useState<SaveState>('idle');

  const save = useCallback(
    async (input: ManualTestCaseInput): Promise<boolean> => {
      setState('saving');
      try {
        await update({ variables: { id: record.id, input, expected_updated_at: record.updated_at ?? null } });
        setState('saved');
        return true;
      } catch (err) {
        setState('error');
        notifyError(
          manualErrorText(t, err, t('testsManual.detail.saveFailed'), { page: '/manual/cases/:caseKey', component })
        );
        if (isConflict(err)) {
          await client
            .refetchQueries({ include: ['ManualTestCase'] })
            .catch((reloadError: unknown) => testsLog.warn('/manual/cases/:caseKey', component, { error: reloadError }));
        }
        return false;
      }
    },
    [client, component, record.id, record.updated_at, t, update]
  );

  return { state, save };
}
