import { useEffect, useRef } from 'react';
import type { CreatePodForm } from '../create-pod.types';

/** Autosaves the draft 4s after the last edit, once the form is dirty. */
export function useDraftAutosave(
  form: CreatePodForm,
  step: number,
  persist: (forStep: number) => Promise<string>
) {
  const latest = useRef({ step, persist });
  latest.current = { step, persist };

  const valuesKey = JSON.stringify(form.watch());
  const dirty = form.formState.isDirty;
  useEffect(() => {
    if (!dirty) return undefined;
    const handle = setTimeout(() => {
      latest.current.persist(latest.current.step).catch(() => undefined);
    }, 4000);
    return () => clearTimeout(handle);
  }, [valuesKey, dirty]);
}
