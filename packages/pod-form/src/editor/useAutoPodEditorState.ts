import { useMemo, useRef, useState } from 'react';
import { podContentRejectionMessage } from '@duncit/utils';
import { autoPodToFormValues, buildAutoPodInput, type AutoPodTemplateRow } from '../build-input';
import { blankAutoPodFormValues, type PodFormValues } from '../types';

export interface UseAutoPodEditorStateArgs {
  /** The Auto Pod being edited (must carry an `id`); null on the create route. */
  editingAutoPod?: (AutoPodTemplateRow & { id: string }) | null;
  /** Values merged over the blank template when creating (e.g. a club's fixed category). */
  createDefaults?: Partial<PodFormValues>;
  submitCreate: (input: ReturnType<typeof buildAutoPodInput>) => Promise<unknown>;
  submitUpdate: (autoPodDocId: string, input: ReturnType<typeof buildAutoPodInput>) => Promise<unknown>;
  onSaved: (meta: { created: boolean }) => void;
}

/**
 * The Auto Pod twin of `usePodEditorState`: one submit pipeline for every
 * console that can open or edit an Auto Pod through the shared form in
 * `autoPod` mode. The template is what goes to the server — `buildAutoPodInput`
 * strips everything a partner supplies later — and a content refusal is
 * surfaced with the rules it broke, exactly as for an ordinary pod.
 */
export default function useAutoPodEditorState({
  editingAutoPod,
  createDefaults,
  submitCreate,
  submitUpdate,
  onSaved,
}: UseAutoPodEditorStateArgs) {
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);

  // Read through a ref so a `createDefaults` built inline every render never
  // re-seeds the form — seeding is keyed on WHICH Auto Pod is open.
  const defaultsRef = useRef(createDefaults);
  defaultsRef.current = createDefaults;

  const rowKey = editingAutoPod?.id ?? '';
  const initialValues = useMemo<PodFormValues>(
    () =>
      editingAutoPod
        ? autoPodToFormValues(editingAutoPod)
        : { ...blankAutoPodFormValues, ...defaultsRef.current },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowKey],
  );

  const submit = async (values: PodFormValues) => {
    setBusy(true);
    setOpError(null);
    try {
      const input = buildAutoPodInput(values);
      if (editingAutoPod) {
        await submitUpdate(editingAutoPod.id, input);
      } else {
        await submitCreate(input);
      }
      onSaved({ created: !editingAutoPod });
    } catch (e: any) {
      setOpError(podContentRejectionMessage(e) ?? e.message);
    } finally {
      setBusy(false);
    }
  };

  return { initialValues, busy, opError, submit };
}
