import { useMemo, useRef, useState } from 'react';
import { podContentRejectionMessage } from '@duncit/utils';
import { buildPodInput, podToFormValues } from '../build-input';
import { blankPodFormValues, type PodFormConfig, type PodFormValues } from '../types';

export interface PodEditorSaveMeta {
  created: boolean;
  draft: boolean;
}

export interface UsePodEditorStateArgs {
  config: PodFormConfig;
  /** The pod being edited; null on the create route. */
  editingPod?: any;
  /** Values merged over the blank form when creating (e.g. a pinned club_id). */
  createDefaults?: Partial<PodFormValues>;
  submitCreate: (input: Record<string, unknown>) => Promise<unknown>;
  submitUpdate: (podDocId: string, input: Record<string, unknown>) => Promise<unknown>;
  onSaved: (meta: PodEditorSaveMeta) => void;
}

/** The form's starting shape for whichever pod (or none) the route opened. */
function seedValues(
  pod: any,
  defaults: Partial<PodFormValues> | undefined,
  singleHost: boolean | undefined,
): PodFormValues {
  if (!pod) return { ...blankPodFormValues, ...defaults };
  const values = podToFormValues(pod);
  // A pod saved before the single-host rule can still carry several ids, and
  // only the first is ever paid or rendered. Hydrate the field with exactly
  // what it will save, so the picker never shows one host while holding two.
  if (singleHost) values.pod_hosts_id = values.pod_hosts_id.slice(0, 1);
  return values;
}

/**
 * Shared create/edit controller for the full-page pod editor — one submit
 * pipeline for every portal: builds the GraphQL input and keeps the is_active
 * toggle authoritative where the config shows it.
 *
 * A CHANGED `venue_slot_id` rides along on update, which is how a portal
 * re-routes a pod's booking (the lever that rescues a venue-rejected pod
 * without creating a new one). An unchanged slot is stripped so a plain
 * content edit never re-enters the venue's approval queue.
 */
export default function usePodEditorState({
  config,
  editingPod,
  createDefaults,
  submitCreate,
  submitUpdate,
  onSaved,
}: UsePodEditorStateArgs) {
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);

  // Most callers build `createDefaults` inline, so its identity changes every
  // render. Read it through a ref: re-seeding is keyed on WHICH pod is open,
  // never on an object that is merely new.
  const defaultsRef = useRef(createDefaults);
  defaultsRef.current = createDefaults;

  const podKey = editingPod?.id ?? '';
  const initialValues = useMemo(
    () => seedValues(editingPod, defaultsRef.current, config.singleHost),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [podKey, config.singleHost],
  );

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
    } catch (e: any) {
      // A content refusal carries the rules it broke; the headline alone
      // ("violates the community guidelines") tells the author nothing about
      // which word in which field to fix.
      setOpError(podContentRejectionMessage(e) ?? e.message);
    } finally {
      setBusy(false);
    }
  };

  return { initialValues, busy, opError, submit };
}
