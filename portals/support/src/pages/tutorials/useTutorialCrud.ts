import { useCallback, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { CREATE_TUTORIAL, DELETE_TUTORIAL, TUTORIAL_STATS, UPDATE_TUTORIAL, type TutorialRow } from './queries';
import { saveErrorMessage } from './errors';
import { toTutorialInput, type TutorialFormOutput } from './tutorial-form';

/** Create / edit / delete wiring for the Tutorials table and its dialog. */
export function useTutorialCrud() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const refetchRef = useRef<(() => void) | null>(null);
  const [editing, setEditing] = useState<TutorialRow | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refetchStats = { refetchQueries: [{ query: TUTORIAL_STATS }] };
  const [createTutorial, createState] = useMutation(CREATE_TUTORIAL, refetchStats);
  const [updateTutorial, updateState] = useMutation(UPDATE_TUTORIAL, refetchStats);
  const [deleteTutorial] = useMutation(DELETE_TUTORIAL, refetchStats);

  const openDialog = useCallback((row: TutorialRow | null) => {
    setEditing(row);
    setError(null);
    setOpen(true);
  }, []);

  const submit = async (values: TutorialFormOutput) => {
    setError(null);
    const input = toTutorialInput(values);
    try {
      if (editing) await updateTutorial({ variables: { tutorial_id: editing.id, input } });
      else await createTutorial({ variables: { input } });
      setOpen(false);
      notifySuccess(editing ? t('support.tutorials.updated') : t('support.tutorials.created'));
      refetchRef.current?.();
    } catch (cause) {
      setError(saveErrorMessage(cause, t('support.tutorials.saveFailed')));
    }
  };

  const remove = useCallback(
    async (row: TutorialRow) => {
      const confirmed = await confirm({
        title: t('support.tutorials.deleteTitle'),
        message: t('support.tutorials.deleteBody'),
        confirmLabel: t('shell.common.delete'),
        destructive: true,
      });
      if (!confirmed) return;
      try {
        await deleteTutorial({ variables: { tutorial_id: row.id } });
        notifySuccess(t('support.tutorials.deleted'));
        refetchRef.current?.();
      } catch (cause) {
        notifyError(saveErrorMessage(cause, t('support.tutorials.deleteFailed')));
      }
    },
    [confirm, deleteTutorial, t],
  );

  return {
    refetchRef,
    editing,
    open,
    error,
    saving: createState.loading || updateState.loading,
    close: () => setOpen(false),
    openNew: () => openDialog(null),
    openEdit: openDialog,
    submit,
    remove,
  };
}
