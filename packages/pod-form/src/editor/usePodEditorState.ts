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
 * for every portal: builds the GraphQL input and keeps the is_active toggle
 * authoritative where the config shows it.
 *
 * A CHANGED `venue_slot_id` rides along on update, which is how a portal
 * re-routes a pod's booking (the lever that rescues a venue-rejected pod
 * without creating a new one). An unchanged slot is stripped so a plain
 * content edit never re-enters the venue's approval queue.
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
    const values = podToFormValues(pod);
    // A pod saved before the single-host rule can still carry several ids, and
    // only the first is ever paid or rendered. Hydrate the field with exactly
    // what it will save, so the picker never shows one host while holding two.
    if (config.singleHost) values.pod_hosts_id = values.pod_hosts_id.slice(0, 1);
    setEditingPod(pod);
    setInitialValues(values);
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
        // Only a genuinely different slot is a re-route; re-saving the same one
        // would needlessly release and re-request the venue's approval.
        const sameSlot = (input.venue_slot_id ?? null) === (editingPod.venue_slot_id ?? null);
        if (sameSlot) delete input.venue_slot_id;
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
