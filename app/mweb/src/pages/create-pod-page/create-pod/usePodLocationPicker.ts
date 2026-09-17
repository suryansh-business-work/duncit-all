import { useState } from 'react';
import { applyPodLocation } from './create-pod.location';
import type { CreatePodForm } from './create-pod.types';

/**
 * The header-style location picker, writing into the pod form instead of the
 * header. Step 1's "Edit location" and step 2's "Change" both open it, so a
 * pick lands the same way from either. `onPicked` runs before the pick is
 * applied — step 1 uses it to stop a late device fix overwriting the choice.
 */
export function usePodLocationPicker(form: CreatePodForm, onPicked?: () => void) {
  const [open, setOpen] = useState(false);
  const [draftLocationId, setDraftLocationId] = useState('');
  const [draftZone, setDraftZone] = useState('');

  const openPicker = () => {
    setDraftLocationId(form.getValues('location_id'));
    setDraftZone(form.getValues('locality'));
    setOpen(true);
  };
  const pick = (locationId: string, zone: string) => {
    onPicked?.();
    applyPodLocation(form, locationId, zone ?? '');
    setOpen(false);
  };

  return {
    openPicker,
    dialog: {
      open,
      onClose: () => setOpen(false),
      draftLocationId,
      setDraftLocationId,
      draftZone,
      setDraftZone,
      onApply: () => pick(draftLocationId, draftZone),
      onAutoApply: pick,
    },
  };
}
