import { useCallback, useMemo } from 'react';
import { useTranslation } from '@duncit/shell';
import { sceneAt, sceneSpans, type ReelSelection } from '../../editor/layout';
import { REEL_EDIT_LIMITS } from '../../editor/limits';
import {
  addOverlay,
  addText,
  duplicateScene,
  insertScene,
  moveScene,
  newScene,
  removeOverlay,
  removeScene,
  removeText,
  setMusic,
  splitScene,
} from '../../editor/specEdits';
import type { SpecEditor } from '../../editor/useSpecEditor';
import type { ReelAsset, ReelSpec } from '../../types';

/** Runs an edit that also names what it created, and hands that id back. */
function applyWithId(apply: SpecEditor['apply'], edit: (spec: ReelSpec) => { spec: ReelSpec; id: string }): string {
  let id = '';
  apply((current) => {
    const result = edit(current);
    id = result.id;
    return result.spec;
  });
  return id;
}

interface Options {
  spec: ReelSpec;
  /** Where the playhead is, in milliseconds of the reel. */
  playheadMs: number;
  selection: ReelSelection | null;
  onSelect: (selection: ReelSelection | null) => void;
  apply: SpecEditor['apply'];
}

/**
 * What the timeline's toolbar does. An item is added to the selected scene, or
 * — with nothing selected — to the scene under the playhead, which is where the
 * operator is looking.
 */
export function useTimelineActions({ spec, playheadMs, selection, onSelect, apply }: Options) {
  const { t } = useTranslation();
  const spans = useMemo(() => sceneSpans(spec), [spec]);
  const underPlayhead = sceneAt(spans, playheadMs);
  const selectedSceneId = selection && selection.kind !== 'music' ? selection.sceneId : null;
  const targetScene = spec.scenes.find((scene) => scene.id === selectedSceneId) ?? underPlayhead?.scene ?? null;
  const sceneSelected = selection?.kind === 'scene';
  const sceneIndex = sceneSelected ? spec.scenes.findIndex((scene) => scene.id === selection.sceneId) : -1;

  const addSceneOf = useCallback(
    (asset: ReelAsset | null) => {
      const scene = newScene(asset);
      // Right after the selected scene, so a new clip lands where the operator is working.
      const at = sceneIndex >= 0 ? sceneIndex + 1 : spec.scenes.length;
      apply((current) => insertScene(current, scene, at));
      onSelect({ kind: 'scene', sceneId: scene.id });
    },
    [apply, onSelect, sceneIndex, spec.scenes.length]
  );

  const addTextHere = useCallback(() => {
    if (!targetScene) return;
    const sceneId = targetScene.id;
    const id = applyWithId(apply, (current) => addText(current, sceneId, t('ai.reels.editor.newText')));
    onSelect({ kind: 'text', sceneId, itemId: id });
  }, [apply, onSelect, t, targetScene]);

  const addOverlayOf = useCallback(
    (asset: ReelAsset) => {
      if (!targetScene) return;
      const sceneId = targetScene.id;
      const id = applyWithId(apply, (current) => addOverlay(current, sceneId, asset.id));
      onSelect({ kind: 'overlay', sceneId, itemId: id });
    },
    [apply, onSelect, targetScene]
  );

  const chooseMusic = useCallback(
    (asset: ReelAsset | null) => {
      apply((current) => setMusic(current, asset?.id ?? null));
      onSelect(asset ? { kind: 'music' } : null);
    },
    [apply, onSelect]
  );

  /** Cuts the scene under the playhead where the playhead is. */
  const split = useCallback(() => {
    if (!underPlayhead) return;
    const { scene, startMs } = underPlayhead;
    const id = applyWithId(apply, (current) => splitScene(current, scene.id, playheadMs - startMs));
    onSelect({ kind: 'scene', sceneId: id });
  }, [apply, onSelect, playheadMs, underPlayhead]);

  const duplicate = useCallback(() => {
    if (!sceneSelected) return;
    const { sceneId } = selection;
    const id = applyWithId(apply, (current) => duplicateScene(current, sceneId));
    onSelect({ kind: 'scene', sceneId: id });
  }, [apply, onSelect, sceneSelected, selection]);

  const remove = useCallback(() => {
    if (!selection) return;
    if (selection.kind === 'music') apply((current) => setMusic(current, null));
    if (selection.kind === 'scene') apply((current) => removeScene(current, selection.sceneId));
    if (selection.kind === 'text') apply((current) => removeText(current, selection.sceneId, selection.itemId));
    if (selection.kind === 'overlay') apply((current) => removeOverlay(current, selection.sceneId, selection.itemId));
    onSelect(null);
  }, [apply, onSelect, selection]);

  const move = useCallback(
    (delta: -1 | 1) => {
      if (sceneSelected) apply((current) => moveScene(current, selection.sceneId, delta));
    },
    [apply, sceneSelected, selection]
  );

  return {
    addSceneOf,
    addTextHere,
    addOverlayOf,
    chooseMusic,
    split,
    duplicate,
    remove,
    move,
    can: {
      addScene: spec.scenes.length < REEL_EDIT_LIMITS.maxScenes,
      addText: targetScene !== null && targetScene.texts.length < REEL_EDIT_LIMITS.maxTexts,
      addOverlay: targetScene !== null && targetScene.overlays.length < REEL_EDIT_LIMITS.maxOverlays,
      split: underPlayhead !== undefined,
      duplicate: sceneSelected && spec.scenes.length < REEL_EDIT_LIMITS.maxScenes,
      remove: selection !== null,
      moveEarlier: sceneIndex > 0,
      moveLater: sceneIndex >= 0 && sceneIndex < spec.scenes.length - 1,
    },
  };
}

export type TimelineActions = ReturnType<typeof useTimelineActions>;
