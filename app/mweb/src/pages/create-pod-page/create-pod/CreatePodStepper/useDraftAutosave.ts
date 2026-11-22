import { useEffect, useRef, useState } from 'react';
import { logs } from '@duncit/logs';
import { createDraftAutosaver, type DraftAutosaveHandle, type DraftAutosaver, type DraftSaveStatus } from '@duncit/utils';
import { serializeDraft } from '../create-pod.form';
import type { CreatePodForm } from '../create-pod.types';
import type { DraftPayload, DraftSaveOptions } from './types';

const report = (error: unknown) => logs.mWeb.warn('create-pod', 'draftAutosave', { error });

/**
 * The host's draft autosave (native twin: the app's useDraftAutosave). Saves
 * the form once the host pauses, only when it differs from the last save; at
 * once on every step change; and on the way out. While anything is unsaved a
 * refresh or a closed tab gets the browser's leave warning, and that last save
 * goes out with `keepalive` so it survives the unload. Leaving inside the app
 * saves too — the app keeps running, so that save lands.
 */
export function useDraftAutosave(
  form: CreatePodForm,
  step: number,
  save: (payload: DraftPayload, options: DraftSaveOptions) => Promise<unknown>,
  onAutosave?: (handle: DraftAutosaveHandle) => void
): DraftAutosaver {
  const [status, setStatus] = useState<DraftSaveStatus>('idle');
  const [unsaved, setUnsaved] = useState(false);
  const latest = useRef({ step, save, onAutosave });
  latest.current = { step, save, onAutosave };
  const unloading = useRef(false);
  const saverRef = useRef<DraftAutosaver | null>(null);
  saverRef.current ??= createDraftAutosaver({
    read: () => serializeDraft(form.getValues(), latest.current.step),
    save: (payload) => latest.current.save(payload, { keepalive: unloading.current }),
    onStatus: setStatus,
    onUnsaved: setUnsaved,
    onError: report,
  });
  const saver = saverRef.current;

  // What the form holds once its mount-time defaults are in (a sole category)
  // counts as saved: opening Create Pod writes nothing by itself.
  useEffect(() => saver.markSaved(), [saver]);

  useEffect(() => {
    const subscription = form.watch(() => saver.schedule());
    return () => subscription.unsubscribe();
  }, [form, saver]);

  // A step change is a checkpoint: saved at once, with the step it moved to.
  useEffect(() => {
    saver.flush().catch(report);
  }, [saver, step]);

  useEffect(() => {
    const leaving = () => {
      if (!saver.hasUnsaved()) return false;
      unloading.current = true;
      saver
        .flush()
        .catch(report)
        .finally(() => {
          unloading.current = false;
        });
      return true;
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (leaving()) event.preventDefault();
    };
    // A phone browser often drops the tab without beforeunload: hiding the
    // page is the last moment it reliably gets to save.
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') leaving();
    };
    globalThis.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      globalThis.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibility);
      saver.flush().catch(report);
    };
  }, [saver]);

  useEffect(() => {
    latest.current.onAutosave?.({ status, unsaved, flush: saver.flush });
  }, [status, unsaved, saver]);

  return saver;
}
