import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { UseFormReturn } from 'react-hook-form';
import { logs } from '@duncit/logs';
import {
  createDraftAutosaver,
  type DraftAutosaveHandle,
  type DraftAutosaver,
  type DraftSaveStatus,
} from '@duncit/utils';

import { serializeDraft } from '../create-pod.form';
import type { CreatePodFormValues } from '../create-pod.types';
import type { DraftPayload } from './types';

const report = (error: unknown) => logs.mobileApp.warn('create-pod', 'draftAutosave', { error });

interface DraftAutosaveArgs {
  form: UseFormReturn<CreatePodFormValues, any, CreatePodFormValues>;
  step: number;
  /** Off for a Club Admin, whose pod is not a host draft. */
  enabled: boolean;
  save: (payload: DraftPayload) => Promise<unknown>;
  onAutosave?: (handle: DraftAutosaveHandle) => void;
}

/**
 * The host's draft autosave (mWeb twin: the page's useDraftAutosave). Saves the
 * form once the host pauses, only when it differs from the last save; at once
 * on every step change; and when the app leaves the foreground, the last moment
 * it is sure to get before the OS may close it. Leaving the screen is guarded by
 * the screen (useDraftLeaveGuard), which waits for this to save first.
 */
export function useDraftAutosave({ form, step, enabled, save, onAutosave }: DraftAutosaveArgs) {
  const [status, setStatus] = useState<DraftSaveStatus>('idle');
  const [unsaved, setUnsaved] = useState(false);
  const latest = useRef({ step, save, onAutosave });
  latest.current = { step, save, onAutosave };
  const saverRef = useRef<DraftAutosaver | null>(null);
  saverRef.current ??= createDraftAutosaver({
    read: () => serializeDraft(form.getValues(), latest.current.step),
    save: (payload) => latest.current.save(payload),
    onStatus: setStatus,
    onUnsaved: setUnsaved,
    onError: report,
  });
  const saver = saverRef.current;

  // What the form holds once its mount-time defaults are in (a sole category)
  // counts as saved: opening Create Pod writes nothing by itself.
  useEffect(() => {
    if (enabled) saver.markSaved();
    else saver.stop();
  }, [saver, enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    const subscription = form.watch(() => saver.schedule());
    return () => subscription.unsubscribe();
  }, [form, saver, enabled]);

  // A step change is a checkpoint: saved at once, with the step it moved to.
  useEffect(() => {
    saver.flush().catch(report);
  }, [saver, step]);

  useEffect(() => {
    if (!enabled) return undefined;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') saver.flush().catch(report);
    });
    return () => {
      subscription.remove();
      // Unmounted without the leave guard (a sign-out reset, say): save anyway.
      saver.flush().catch(report);
    };
  }, [saver, enabled]);

  useEffect(() => {
    if (enabled) {
      latest.current.onAutosave?.({ status, unsaved, flush: saver.flush });
    }
  }, [status, unsaved, saver, enabled]);

  return saver;
}
