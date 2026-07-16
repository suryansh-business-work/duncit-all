import { useEffect, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import {
  blankPodFormValues,
  buildPodInput,
  podToFormValues,
  type PodFormConfig,
  type PodFormValues,
} from '@duncit/pod-form';
import { useConfirm, notifyError } from '@duncit/dialogs';
import { CREATE, UPDATE, DELETE, POD_FOR_EDIT, type PodRow } from './queries';

interface Args {
  config: PodFormConfig;
  clubFilter: string;
  /** /pods?edit=<id> deep-link target (rows are paged, so the pod is fetched directly). */
  editId: string;
  onChanged: (message: string) => void;
}

/** Create/edit/delete state + submit for the pod form (extracted from PodsPage). */
export default function usePodEditor({ config, clubFilter, editId, onChanged }: Args) {
  const client = useApolloClient();
  const [createMut] = useMutation(CREATE);
  const [updateMut] = useMutation(UPDATE);
  const [deleteMut] = useMutation(DELETE);
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<PodFormValues>(blankPodFormValues);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setInitialValues({ ...blankPodFormValues, club_id: clubFilter || '' });
    setOpError(null);
    setOpen(true);
  };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    setInitialValues(podToFormValues(p));
    setOpError(null);
    setOpen(true);
  };

  // Deep-link from the Pod details page: guarded so closing the dialog never reopens it.
  const handledEditRef = useRef('');
  useEffect(() => {
    if (!editId || handledEditRef.current === editId) return;
    handledEditRef.current = editId;
    client
      .query({ query: POD_FOR_EDIT, variables: { id: editId }, fetchPolicy: 'network-only' })
      .then(({ data }) => {
        if (data?.pod) openEdit(data.pod);
      })
      .catch((e: Error) => notifyError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, client]);

  const submit = async (values: PodFormValues, options: { draft: boolean }) => {
    setBusy(true);
    setOpError(null);
    try {
      const isDraft = options.draft;
      const input = buildPodInput(values, { draft: isDraft, config });
      if (editingId) {
        await updateMut({ variables: { id: editingId, input: { ...input, is_active: values.is_active } } });
      } else {
        await createMut({ variables: { input: { ...input, pod_id: values.pod_id || undefined } } });
      }
      onChanged(isDraft ? 'Draft saved' : 'Saved');
      setOpen(false);
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: PodRow) => {
    const ok = await confirm({
      title: 'Delete pod',
      message: `Delete pod "${p.pod_title}"?`,
      destructive: true,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteMut({ variables: { id: p.id } });
      onChanged('Deleted');
    } catch (e: any) {
      notifyError(e.message);
    }
  };

  const close = () => setOpen(false);

  return { open, initialValues, busy, opError, openCreate, openEdit, submit, remove, close };
}
