import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifyError } from '@duncit/dialogs';
import { logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { SAVE_REEL_SPEC } from '../queries';
import type { ReelProject, ReelSpec } from '../types';

/** Long enough to coalesce a drag or a burst of typing into one save. */
export const SAVE_DELAY_MS = 700;
const HISTORY_LIMIT = 50;

export type SaveState = 'saved' | 'pending' | 'saving' | 'failed';

interface SaveData {
  saveReelSpec: { id: string; spec: ReelSpec };
}

/**
 * The reel as it is being edited by hand.
 *
 * The timeline edits a local draft, which the player renders at once; the draft
 * is saved a moment after the last change. A spec that changes on the server —
 * a chat reply, a restored version — replaces the draft unless a hand edit is
 * still waiting to be saved, so neither the operator's edit nor the editor's
 * reply is silently thrown away.
 */
export function useSpecEditor(project: ReelProject) {
  const { t } = useTranslation();
  const [save] = useMutation<SaveData>(SAVE_REEL_SPEC);
  const [spec, setSpec] = useState<ReelSpec>(project.spec);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [, rerender] = useReducer((count: number) => count + 1, 0);

  const specRef = useRef(spec);
  const past = useRef<ReelSpec[]>([]);
  const future = useRef<ReelSpec[]>([]);
  const waiting = useRef<ReelSpec | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(0);
  const serverSpec = useRef(project.spec);

  const show = useCallback((next: ReelSpec) => {
    specRef.current = next;
    setSpec(next);
  }, []);

  const flush = useCallback(async () => {
    timer.current = null;
    const next = waiting.current;
    if (!next) return;
    waiting.current = null;
    inFlight.current += 1;
    setSaveState('saving');
    try {
      const { data } = await save({ variables: { project_id: project.id, spec_json: JSON.stringify(next) } });
      // The server's answer is the sanitized reel; it is what plays from now on —
      // unless the operator has edited again meanwhile, in which case theirs wins.
      if (!waiting.current && data) show(data.saveReelSpec.spec);
      setSaveState(waiting.current ? 'pending' : 'saved');
    } catch (error) {
      setSaveState('failed');
      notifyError(parseApiError(error, t('ai.reels.editor.saveFailed')));
      logs.portal.ai.error('reels', 'saveSpec', { error, project_id: project.id });
    } finally {
      inFlight.current -= 1;
    }
  }, [project.id, save, show, t]);

  const queueSave = useCallback(
    (next: ReelSpec) => {
      waiting.current = next;
      setSaveState('pending');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        flush().catch(() => undefined);
      }, SAVE_DELAY_MS);
    },
    [flush]
  );

  /** One hand edit: drawn now, undoable, saved shortly. */
  const apply = useCallback(
    (change: (current: ReelSpec) => ReelSpec) => {
      const current = specRef.current;
      const next = change(current);
      if (next === current) return;
      past.current = [...past.current.slice(-(HISTORY_LIMIT - 1)), current];
      future.current = [];
      show(next);
      queueSave(next);
    },
    [queueSave, show]
  );

  const undo = useCallback(() => {
    const previous = past.current.at(-1);
    if (!previous) return;
    past.current = past.current.slice(0, -1);
    future.current = [specRef.current, ...future.current];
    show(previous);
    queueSave(previous);
    rerender();
  }, [queueSave, show]);

  const redo = useCallback(() => {
    const [next, ...rest] = future.current;
    if (!next) return;
    future.current = rest;
    past.current = [...past.current, specRef.current];
    show(next);
    queueSave(next);
    rerender();
  }, [queueSave, show]);

  // A reel changed on the server replaces the draft, unless a hand edit is waiting.
  useEffect(() => {
    if (project.spec === serverSpec.current) return;
    serverSpec.current = project.spec;
    if (!waiting.current && inFlight.current === 0) show(project.spec);
  }, [project.spec, show]);

  // Leaving the studio saves what is waiting rather than dropping it. Read
  // through a ref so this runs on unmount only — keyed on `flush`, a re-render
  // that handed out a new one would fire it early and skip the debounce.
  const latestFlush = useRef(flush);
  latestFlush.current = flush;
  useEffect(
    () => () => {
      if (!timer.current) return;
      clearTimeout(timer.current);
      latestFlush.current().catch(() => undefined);
    },
    []
  );

  return {
    spec,
    apply,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    saveState,
  };
}

export type SpecEditor = ReturnType<typeof useSpecEditor>;
