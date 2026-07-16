import { useEffect, useRef, useState } from 'react';
import { buildPodInput, podToFormValues } from '../build-input';
import { blankPodFormValues, type PodFormConfig, type PodFormValues } from '../types';

export interface PodEditorSaveMeta {
  created: boolean;
  draft: boolean;
}

export interface UsePodEditorStateArgs {
  config: PodFormConfig;
  /** Values merged over the blank form when creating (e.g. a pinned club_id). */
  createDefaults?: Partial<PodFormValues>;
  submitCreate: (input: Record<string, unknown>) => Promise<unknown>;
  submitUpdate: (podDocId: string, input: Record<string, unknown>) => Promise<unknown>;
  onSaved: (meta: PodEditorSaveMeta) => void;
  /** Optional deep-link (e.g. /pods?edit=<id>): resolve the pod to open on. */
  editId?: string;
  /** Fetches the deep-linked pod; resolve null (and self-report errors) to skip. */
  resolveEditPod?: (id: string) => Promise<any>;
}

/**
 * Shared create/edit dialog controller for the pod form — one submit pipeline
 * for every portal: builds the GraphQL input, strips `venue_slot_id` on update
 * (UpdatePodInput has no slot field; slot re-booking is create-only) and keeps
 * the is_active toggle authoritative where the config shows it.
 */
export default function usePodEditorState({
  config,
  createDefaults,
  submitCreate,
  submitUpdate,
  onSaved,
  editId,
  resolveEditPod,
}: UsePodEditorStateArgs) {
  const [open, setOpen] = useState(false);
  const [editingPod, setEditingPod] = useState<any>(null);
  const [initialValues, setInitialValues] = useState<PodFormValues>(blankPodFormValues);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);

  const openCreate = () => {
    setEditingPod(null);
    setInitialValues({ ...blankPodFormValues, ...createDefaults });
    setOpError(null);
    setOpen(true);
  };

  const openEdit = (pod: any) => {
    setEditingPod(pod);
    setInitialValues(podToFormValues(pod));
    setOpError(null);
    setOpen(true);
  };

  // Deep-link target: guarded so closing the dialog never reopens it.
  const handledEditRef = useRef('');
  useEffect(() => {
    if (!editId || !resolveEditPod || handledEditRef.current === editId) return;
    handledEditRef.current = editId;
    resolveEditPod(editId)
      .then((pod) => {
        if (pod) openEdit(pod);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const submit = async (values: PodFormValues, options: { draft: boolean }) => {
    setBusy(true);
    setOpError(null);
    try {
      const input = buildPodInput(values, { draft: options.draft, config });
      if (editingPod) {
        // UpdatePodInput has no venue_slot_id — slot changes go through the venue flow.
        delete input.venue_slot_id;
        if (!options.draft && config.showIsActive) input.is_active = values.is_active;
        await submitUpdate(editingPod.id, input);
      } else {
        await submitCreate({ ...input, pod_id: values.pod_id || undefined });
      }
      onSaved({ created: !editingPod, draft: options.draft });
      setOpen(false);
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const close = () => setOpen(false);

  return { open, initialValues, editingPod, busy, opError, openCreate, openEdit, submit, close };
}
