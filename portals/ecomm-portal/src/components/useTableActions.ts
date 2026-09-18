import { useCallback, useRef } from 'react';
import { useMutation } from '@apollo/client/react';
import type { DocumentNode } from 'graphql';
import { useTranslation } from '@duncit/shell';
import { runAction, type SuccessMessage } from '../lib/actions';
import { useConfirmDelete } from './useConfirmDelete';

/**
 * The ref a server table fills with its refetch, and a runner that announces
 * a write's outcome and reloads the rows once it went through.
 */
export function useTableRefresh() {
  const refetchRef = useRef<(() => void) | null>(null);
  const run = useCallback(async (action: () => Promise<unknown>, success: SuccessMessage) => {
    const ok = await runAction(action, success);
    if (ok) refetchRef.current?.();
    return ok;
  }, []);
  return { refetchRef, run };
}

type Runner = ReturnType<typeof useTableRefresh>['run'];

/** Delete one row after a confirmation that names it, then reload the table. */
export function useRowDelete(deleteDoc: DocumentNode, run: Runner) {
  const { t } = useTranslation();
  const confirmDelete = useConfirmDelete();
  const [remove] = useMutation(deleteDoc);
  return useCallback(
    async (id: string, name: string) => {
      if (!(await confirmDelete(name))) return;
      await run(() => remove({ variables: { id } }), t('shell.common.deleted'));
    },
    [confirmDelete, remove, run, t],
  );
}
