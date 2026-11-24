import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { MY_REEL_STUDIO_LAYOUT, RESET_REEL_STUDIO_LAYOUT, SAVE_REEL_STUDIO_LAYOUT } from '../../queries';
import {
  defaultLayout,
  fromSaved,
  sameLayout,
  toPanes,
  withMode,
  withRect,
  withSize,
  type PaneId,
  type PaneMode,
  type PaneState,
  type StudioLayout,
} from './layoutModel';

interface SavedLayout {
  myReelStudioLayout: { panes: PaneState[]; updated_at: string | null } | null;
}

/**
 * The studio's arrangement for the signed-in person: what they saved, and the
 * changes they have made since. Nothing is written until they press Save
 * layout — dragging a divider is trying something, not deciding on it — and
 * Restore view forgets the saved arrangement so the defaults come back.
 *
 * `revision` changes whenever the arrangement is replaced wholesale (the saved
 * one arriving, a restore), which is the split view's cue to take the new
 * sizes; a divider drag only records where it ended.
 */
export function useStudioLayout() {
  const { t } = useTranslation();
  const { data } = useQuery<SavedLayout>(MY_REEL_STUDIO_LAYOUT, { fetchPolicy: 'cache-and-network' });
  const [saveLayout, { loading: saving }] = useMutation(SAVE_REEL_STUDIO_LAYOUT);
  const [resetLayout, { loading: restoring }] = useMutation(RESET_REEL_STUDIO_LAYOUT);
  const saved = useMemo(() => fromSaved(data?.myReelStudioLayout?.panes), [data]);
  const [layout, setLayout] = useState<StudioLayout>(defaultLayout);
  const [revision, setRevision] = useState(0);
  const touched = useRef(false);

  // The saved arrangement replaces the defaults when it arrives — unless the
  // person has already started rearranging, which it must not undo.
  useEffect(() => {
    if (touched.current || !data) return;
    setLayout(saved);
    setRevision((value) => value + 1);
  }, [data, saved]);

  const change = useCallback((next: (current: StudioLayout) => StudioLayout) => {
    touched.current = true;
    setLayout(next);
  }, []);

  const setMode = useCallback((id: PaneId, mode: PaneMode) => change((current) => withMode(current, id, mode)), [change]);
  const setSize = useCallback((id: PaneId, size: number) => change((current) => withSize(current, id, size)), [change]);
  const setRect = useCallback((id: PaneId, rect: { x: number; y: number; width: number; height: number }) => change((current) => withRect(current, id, rect)), [change]);

  const save = useCallback(async () => {
    try {
      await saveLayout({ variables: { panes: toPanes(layout) }, refetchQueries: [{ query: MY_REEL_STUDIO_LAYOUT }], awaitRefetchQueries: true });
      notifySuccess(t('ai.reels.layout.saved'));
    } catch (error) {
      notifyError(parseApiError(error, t('ai.reels.layout.saveFailed')));
    }
  }, [layout, saveLayout, t]);

  const restore = useCallback(async () => {
    try {
      await resetLayout({ refetchQueries: [{ query: MY_REEL_STUDIO_LAYOUT }], awaitRefetchQueries: true });
      touched.current = false;
      setLayout(defaultLayout());
      setRevision((value) => value + 1);
      notifySuccess(t('ai.reels.layout.restored'));
    } catch (error) {
      notifyError(parseApiError(error, t('ai.reels.layout.restoreFailed')));
    }
  }, [resetLayout, t]);

  return {
    layout,
    revision,
    /** True when what is on screen differs from what is saved. */
    dirty: !sameLayout(layout, saved),
    saving,
    restoring,
    setMode,
    setSize,
    setRect,
    save,
    restore,
  };
}

export type StudioLayoutState = ReturnType<typeof useStudioLayout>;
