import { useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { GROWTH_TITLE_MAX } from '../../../lib/growth-calculator';
import {
  DELETE_GROWTH_CALCULATION,
  DUPLICATE_GROWTH_CALCULATION,
  type DeleteGrowthCalculationData,
  type DuplicateGrowthCalculationData,
  type DuplicateGrowthCalculationVars,
  type SavedCalculation,
} from '../../../lib/queries';

/**
 * Duplicate and Delete for a saved row. Duplicate is a server copy of the
 * row's inputs under the caller's name; Delete asks first and the server
 * re-checks that the caller may delete it. Both refresh the list after.
 */
export function useCalculationActions(refetch: () => void) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [duplicateMutation] = useMutation<DuplicateGrowthCalculationData, DuplicateGrowthCalculationVars>(
    DUPLICATE_GROWTH_CALCULATION
  );
  const [deleteMutation] = useMutation<DeleteGrowthCalculationData, { id: string }>(DELETE_GROWTH_CALCULATION);

  const failed = useCallback(
    (action: string, row: SavedCalculation, error: unknown) => {
      logs.portal.targets.error('useCalculationActions', action, { error, id: row.id });
      notifyError(t('targets.growth.saved.actionFailed'));
    },
    [t]
  );

  const duplicate = useCallback(
    async (row: SavedCalculation) => {
      const title = t('targets.growth.saved.copyTitle', { vars: { title: row.title } }).slice(0, GROWTH_TITLE_MAX);
      try {
        await duplicateMutation({ variables: { id: row.id, title, clientRequestId: crypto.randomUUID() } });
        notifySuccess(t('targets.growth.saved.duplicated'));
        refetch();
      } catch (error) {
        failed('duplicate', row, error);
      }
    },
    [duplicateMutation, failed, refetch, t]
  );

  const remove = useCallback(
    async (row: SavedCalculation) => {
      const ok = await confirm({
        title: t('targets.growth.saved.deleteTitle'),
        message: t('targets.growth.saved.deleteMessage', { vars: { title: row.title } }),
        confirmLabel: t('targets.growth.saved.delete'),
        destructive: true,
      });
      if (!ok) return;
      try {
        await deleteMutation({ variables: { id: row.id } });
        notifySuccess(t('targets.growth.saved.deleted'));
        refetch();
      } catch (error) {
        failed('delete', row, error);
      }
    },
    [confirm, deleteMutation, failed, refetch, t]
  );

  return { duplicate, remove };
}
