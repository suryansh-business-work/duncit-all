import { useCallback, useState, type MutableRefObject } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { DELETE_AI_PROMPT, RESET_AI_PROMPT } from '../../queries';
import { ARCHIVE_AI_PROMPT, UNARCHIVE_AI_PROMPT } from '../../detailQueries';
import { useDetailCopy } from '../../i18n/useDetailCopy';
import type { AiPrompt } from '../../types';
import { runInBackground } from '../../log';

/**
 * The library's writes and the dialogs that guard them: the editor, and the
 * confirmations before delete, reset and archive. Every write ends by asking
 * the table to re-read, because each one can move a row in or out of the tab.
 */
export function useLibraryActions(refetchRef: MutableRefObject<(() => void) | null>) {
  const copy = useDetailCopy();
  const [editing, setEditing] = useState<AiPrompt | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [toDelete, setToDelete] = useState<AiPrompt | null>(null);
  const [toReset, setToReset] = useState<AiPrompt | null>(null);
  const [toArchive, setToArchive] = useState<AiPrompt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletePrompt, deleting] = useMutation(DELETE_AI_PROMPT);
  const [resetPrompt, resetting] = useMutation(RESET_AI_PROMPT);
  const [archivePrompt, archiving] = useMutation(ARCHIVE_AI_PROMPT);
  const [unarchivePrompt] = useMutation(UNARCHIVE_AI_PROMPT);

  const refresh = useCallback(() => refetchRef.current?.(), [refetchRef]);

  /** Every row write is the same dance: clear the error, write, re-read, close. */
  const run = useCallback(
    async (prompt: AiPrompt | null, write: (id: string) => Promise<unknown>, clear: () => void, done?: string) => {
      if (!prompt) return;
      setError(null);
      try {
        await write(prompt.id);
        if (done) notifySuccess(done);
        refresh();
      } catch (err) {
        setError(parseApiError(err));
      } finally {
        clear();
      }
    },
    [refresh],
  );

  const openCreate = useCallback(() => {
    setEditing(null);
    setEditorOpen(true);
  }, []);
  const openEdit = useCallback((prompt: AiPrompt) => {
    setEditing(prompt);
    setEditorOpen(true);
  }, []);
  const unarchive = useCallback(
    (prompt: AiPrompt) =>
      runInBackground(run(prompt, (id) => unarchivePrompt({ variables: { id } }), () => undefined, copy.actions.unarchived), 'unarchive'),
    [run, unarchivePrompt, copy],
  );

  return {
    error,
    setError,
    refresh,
    editor: { open: editorOpen, prompt: editing, close: () => setEditorOpen(false) },
    openCreate,
    openEdit,
    unarchive,
    askDelete: setToDelete,
    askReset: setToReset,
    askArchive: setToArchive,
    confirmDelete: {
      prompt: toDelete,
      busy: deleting.loading,
      confirm: () => run(toDelete, (id) => deletePrompt({ variables: { id } }), () => setToDelete(null)),
      cancel: () => setToDelete(null),
    },
    confirmReset: {
      prompt: toReset,
      busy: resetting.loading,
      confirm: () => run(toReset, (id) => resetPrompt({ variables: { id } }), () => setToReset(null)),
      cancel: () => setToReset(null),
    },
    confirmArchive: {
      prompt: toArchive,
      busy: archiving.loading,
      confirm: () =>
        run(toArchive, (id) => archivePrompt({ variables: { id } }), () => setToArchive(null), copy.actions.archived),
      cancel: () => setToArchive(null),
    },
  };
}

export type LibraryActions = ReturnType<typeof useLibraryActions>;
