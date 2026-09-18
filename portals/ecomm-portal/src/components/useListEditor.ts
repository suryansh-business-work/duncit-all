import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import type { DocumentNode } from 'graphql';
import { useTranslation } from '@duncit/shell';
import { runAction } from '../lib/actions';
import { useConfirmDelete } from './useConfirmDelete';

interface ListEditorDocs {
  /** `store<Save>(id: ID, input: …)` — creates without an id, updates with one. */
  save: DocumentNode;
  /** `store<Delete>(id: ID!)`. */
  remove: DocumentNode;
  /** `store<Reorder>(ids: [ID!]!)`. */
  reorder: DocumentNode;
  /** The list query every write refreshes. */
  list: DocumentNode;
}

/** Which record a dialog is editing — a new one, or an existing row. */
export type Editing<T> = T | 'new' | null;

/**
 * Everything a hand-ordered list page does besides drawing itself: which row
 * the dialog is editing, and the save / delete (after a named confirmation) /
 * reorder writes — each refreshing the list and announcing its outcome.
 */
export function useListEditor<T extends { id: string }>(docs: Readonly<ListEditorDocs>) {
  const { t } = useTranslation();
  const confirmDelete = useConfirmDelete();
  const [editing, setEditing] = useState<Editing<T>>(null);
  const refresh = { refetchQueries: [docs.list], awaitRefetchQueries: true };
  const [save, saveState] = useMutation(docs.save, refresh);
  const [remove, removeState] = useMutation(docs.remove, refresh);
  const [reorder, reorderState] = useMutation(docs.reorder, refresh);

  const submit = async (input: Record<string, unknown>) => {
    const id = editing && editing !== 'new' ? editing.id : null;
    const saved = await runAction(() => save({ variables: { id, input } }), t('ecommPortal.common.saved'));
    if (saved) setEditing(null);
  };

  const onDelete = async (item: T, name: string, message?: string) => {
    if (!(await confirmDelete(name, message))) return;
    await runAction(() => remove({ variables: { id: item.id } }), t('shell.common.deleted'));
  };

  const onReorder = async (ids: string[]) => {
    await runAction(() => reorder({ variables: { ids } }), t('ecommPortal.list.reordered'));
  };

  return {
    editing,
    setEditing,
    submit,
    onDelete,
    onReorder,
    saving: saveState.loading,
    busy: saveState.loading || removeState.loading || reorderState.loading,
  };
}
