import { useCallback, useMemo, useState } from 'react';
import { useMutation } from '@apollo/client';
import { notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useCategoryValue } from '@duncit/category';
import {
  emptyAutoPodForm,
  toAutoPodForm,
  toAutoPodInput,
  type AutoPodFormValues,
} from './auto-pod-form';
import { CREATE_AUTO_POD, UPDATE_AUTO_POD, type AutoPodTableRow } from './queries';

interface EditorOptions {
  t: (key: string, options?: { vars?: Record<string, string | number> }) => string;
  /** Reload the table after a write lands. */
  onSaved: () => void;
}

/**
 * Create / edit state for the Auto Pod dialog. The category picker persists a
 * super id + a sub id, so an edit has to be rehydrated from the admin category
 * tree before the form can show what was chosen.
 */
export default function useAutoPodEditor({ t, onSaved }: Readonly<EditorOptions>) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AutoPodTableRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createMutation] = useMutation(CREATE_AUTO_POD);
  const [updateMutation] = useMutation(UPDATE_AUTO_POD);

  const category = useCategoryValue(editing?.super_category_id, editing?.sub_category_id);
  const initialValues = useMemo(
    () => (editing ? toAutoPodForm(editing, category) : emptyAutoPodForm),
    [editing, category]
  );

  const openCreate = useCallback(() => {
    setEditing(null);
    setError(null);
    setOpen(true);
  }, []);

  const openEdit = useCallback((row: AutoPodTableRow) => {
    setEditing(row);
    setError(null);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setError(null);
  }, []);

  const submit = useCallback(
    async (values: AutoPodFormValues) => {
      setSaving(true);
      setError(null);
      try {
        const input = toAutoPodInput(values);
        if (editing) {
          await updateMutation({ variables: { auto_pod_doc_id: editing.id, input } });
          notifySuccess(t('admin.autoPods.updated'));
        } else {
          await createMutation({ variables: { input } });
          notifySuccess(t('admin.autoPods.created'));
        }
        setOpen(false);
        onSaved();
      } catch (caught) {
        setError(t('admin.autoPods.saveFailed', { vars: { reason: parseApiError(caught) } }));
      } finally {
        setSaving(false);
      }
    },
    [createMutation, editing, onSaved, t, updateMutation]
  );

  return { open, saving, error, initialValues, openCreate, openEdit, close, submit };
}
