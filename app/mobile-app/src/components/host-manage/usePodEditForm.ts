import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';

import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import {
  makePodEditSchema,
  podEditInitialValues,
  podEditIsFree,
  type HostPodSummary,
  type PodEditValues,
} from './pod-edit.form';
import { usePodEditSave } from './usePodEditSave';
import { usePodSpotLimits } from './usePodSpotLimits';

/**
 * The host's Edit Pod sheet state: the form (re-seeded whenever the pod
 * changes), the server's spot range, and the check-then-save handler. Kept
 * out of `PodEditDialog` so the sheet stays layout.
 */
export function usePodEditForm(pod: HostPodSummary | null, onSaved: () => void) {
  const { t } = useTranslation();
  const free = podEditIsFree(pod);
  const schema = useMemo(() => makePodEditSchema(t, free), [t, free]);
  const form = useForm<PodEditValues, any, PodEditValues>({
    resolver: formResolver<PodEditValues>(schema),
    defaultValues: podEditInitialValues(pod),
  });
  const { reset, setError, setValue } = form;
  const limits = usePodSpotLimits(pod?.id);
  const saver = usePodEditSave(pod?.id, setError, onSaved, !!limits, free);
  const { clear } = saver;

  useEffect(() => {
    reset(podEditInitialValues(pod));
    clear();
    // `clear` is a fresh closure each render; re-seeding is keyed on the pod.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pod, reset]);

  // The limits land after the reset above, so the capacity is seeded from the
  // SERVER's current figure rather than the row the list happened to hold.
  useEffect(() => {
    if (limits) setValue('no_of_spots_text', String(limits.current));
  }, [limits, setValue]);

  return { form, free, limits, ...saver };
}
