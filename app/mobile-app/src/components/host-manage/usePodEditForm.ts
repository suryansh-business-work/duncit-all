import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';

import { useSmartIncentiveSettings } from '@/hooks/useSmartIncentiveSettings';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import {
  makePodEditSchema,
  podEditCarriesSmartIncentive,
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
  // Shown, checked and sent only while Loyalty's programme is known to be on
  // and the row says what the pod offers now (PodEditOffers); otherwise a save
  // leaves the pod's offer exactly as it is.
  const programme = useSmartIncentiveSettings();
  const smartIncentive = programme.enabled && podEditCarriesSmartIncentive(pod);
  const smartIncentiveMaxPct = smartIncentive ? programme.maxPct : null;
  const schema = useMemo(
    () => makePodEditSchema(t, free, smartIncentiveMaxPct),
    [t, free, smartIncentiveMaxPct],
  );
  const form = useForm<PodEditValues, any, PodEditValues>({
    resolver: formResolver<PodEditValues>(schema),
    defaultValues: podEditInitialValues(pod),
  });
  const { reset, setError, setValue } = form;
  const limits = usePodSpotLimits(pod?.id);
  const saver = usePodEditSave(pod?.id, setError, onSaved, !!limits, free, smartIncentive);
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

/** The sheet's react-hook-form instance, for the fields it hands the form to. */
export type PodEditForm = ReturnType<typeof usePodEditForm>['form'];
