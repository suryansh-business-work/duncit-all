import { useCallback, useRef } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { firstGraphQLError } from '@duncit/utils';
import type { GrowthInputs } from '../../lib/growth-calculator';
import {
  SAVE_GROWTH_CALCULATION,
  UPDATE_GROWTH_CALCULATION,
  type SaveGrowthCalculationData,
  type SaveGrowthCalculationVars,
  type SavedCalculation,
  type UpdateGrowthCalculationData,
  type UpdateGrowthCalculationVars,
} from '../../lib/queries';
import type { SaveCalculationFormValues } from './save-calculation';

type Attempt = { current: { key: string; id: string } | null };

/** The request id for this attempt: the same while the payload is the same, new once it changes. */
function requestIdFor(attempt: Attempt, key: string): string {
  if (attempt.current?.key !== key) attempt.current = { key, id: crypto.randomUUID() };
  return attempt.current.id;
}

interface Options {
  /** The current, valid assumptions — null while any is invalid. */
  inputs: GrowthInputs | null;
  editing: SavedCalculation | null;
  /** After a save or an update lands: refresh the list, leave edit mode. */
  onSaved: () => void;
}

/**
 * Saves a new calculation or updates the one being edited.
 *
 * A new save carries one request id per attempt at the same title, description
 * and inputs, so a double click or a retry after a dropped response returns the
 * record the first attempt made instead of writing a twin. Changing anything
 * starts a new attempt. An update names the revision it was made against, and
 * one that lost a race says so rather than overwriting someone else's edit.
 */
export function useSaveCalculation({ inputs, editing, onSaved }: Options) {
  const { t } = useTranslation();
  const [saveMutation] = useMutation<SaveGrowthCalculationData, SaveGrowthCalculationVars>(SAVE_GROWTH_CALCULATION);
  const [updateMutation] = useMutation<UpdateGrowthCalculationData, UpdateGrowthCalculationVars>(
    UPDATE_GROWTH_CALCULATION
  );
  const attempt = useRef<{ key: string; id: string } | null>(null);

  return useCallback(
    async (values: SaveCalculationFormValues): Promise<boolean> => {
      if (!inputs) return false;
      const fields = { title: values.title, description: values.description, inputs };
      try {
        if (editing) {
          await updateMutation({
            variables: { id: editing.id, input: { ...fields, expected_revision: editing.revision } },
          });
          notifySuccess(t('targets.growth.save.updated'));
        } else {
          const client_request_id = requestIdFor(attempt, JSON.stringify(fields));
          await saveMutation({ variables: { input: { ...fields, client_request_id } } });
          attempt.current = null;
          notifySuccess(t('targets.growth.save.saved'));
        }
        onSaved();
        return true;
      } catch (error) {
        const code = firstGraphQLError(error)?.extensions?.code;
        logs.portal.targets.error('useSaveCalculation', editing ? 'update' : 'save', { error, code });
        notifyError(code === 'CONFLICT' ? t('targets.growth.save.conflict') : t('targets.growth.save.failed'));
        return false;
      }
    },
    [inputs, editing, onSaved, saveMutation, updateMutation, t]
  );
}
