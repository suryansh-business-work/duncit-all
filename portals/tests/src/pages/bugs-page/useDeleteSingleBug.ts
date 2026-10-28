import { useMutation } from '@apollo/client/react';
import { notify, useConfirm } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { DELETE_BUGS, type BugRow } from './queries';

/**
 * The bug table's per-row bin.
 *
 * Bulk work — the ticked rows, a filtered view, a date window — belongs to the
 * shared telemetry-delete components, which every telemetry table uses. What
 * stays here is the one gesture that is about a SINGLE bug and can therefore
 * name it in the confirmation: its title and how many occurrences go with it.
 */
export function useDeleteSingleBug(onDeleted: () => void) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [deleteBugs] = useMutation<{ deleteBugs: number }>(DELETE_BUGS);

  return async (bug: BugRow) => {
    const ok = await confirm({
      title: t('tech.bugs.deleteThisBug'),
      message: `"${bug.title}" and its ${bug.occurrence_count} recorded occurrences roll-up will be deleted permanently. If the error happens again it reappears as a fresh bug.`,
      confirmLabel: t('shell.common.delete'),
      destructive: true,
    });
    if (!ok) return;
    try {
      // Reported with the count the SERVER returned, not the count asked for.
      const res = await deleteBugs({ variables: { ids: [bug.id] } });
      notify(t('tech.telemetryDelete.deleted', { count: res.data?.deleteBugs ?? 0 }), 'success');
      onDeleted();
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };
}
