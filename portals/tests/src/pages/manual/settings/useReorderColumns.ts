import { useCallback, useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { arrayMove } from '@dnd-kit/sortable';
import { notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { isConflict, manualErrorText } from '../shared/errors';
import { MANUAL_TEST_COLUMNS, type ColumnsData } from '../shared/lookup.queries';
import {
  REORDER_MANUAL_TEST_COLUMNS,
  type ReorderColumnsData,
  type ReorderColumnsVariables,
} from '../shared/settings.queries';
import type { ManualColumn } from '../shared/types';

const WHERE = { page: '/manual/settings', component: 'useReorderColumns' };

/**
 * The columns in the order the person just dragged them to. The new order
 * shows at once; the server's answer replaces it, and a refusal puts the
 * saved order back (reloading it when the board changed underneath).
 */
export function useReorderColumns(columns: readonly ManualColumn[], reload: () => void) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<string[] | null>(null);
  const [reorder, { loading }] = useMutation<ReorderColumnsData, ReorderColumnsVariables>(REORDER_MANUAL_TEST_COLUMNS, {
    // The answer IS the new list: written over the cached one, so nothing reloads or flickers.
    update: (cache, { data }) => {
      if (data) cache.writeQuery<ColumnsData>({ query: MANUAL_TEST_COLUMNS, data: { manualTestColumns: data.reorderManualTestColumns } });
    },
  });

  const ordered = useMemo(() => {
    if (!pending) return columns;
    const byId = new Map(columns.map((column) => [column.id, column]));
    return pending.map((id) => byId.get(id)).filter((column): column is ManualColumn => Boolean(column));
  }, [columns, pending]);

  const move = useCallback(
    async (activeId: string, overId: string) => {
      const ids = ordered.map((column) => column.id);
      const from = ids.indexOf(activeId);
      const to = ids.indexOf(overId);
      if (from === -1 || to === -1 || from === to) return;
      const next = arrayMove(ids, from, to);
      setPending(next);
      try {
        await reorder({ variables: { ids: next } });
      } catch (err) {
        notifyError(manualErrorText(t, err, t('testsManual.settings.reorderFailed'), WHERE));
        if (isConflict(err)) reload();
      } finally {
        setPending(null);
      }
    },
    [ordered, reload, reorder, t]
  );

  return { ordered, move, saving: loading };
}
